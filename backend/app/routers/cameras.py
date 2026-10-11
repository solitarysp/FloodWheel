import base64
from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.camera import CameraCreate, CameraResponse, FloodReadingSummary
from app.models.db_models import FloodReadingDB, FloodZone
from app.models.flood_reading import AnalysisResponse
from app.services.camera_registry import CameraRegistry
from app.services.camera_service_client import CameraServiceClient
from app.services.camera_stream_service import CameraStreamService
from app.services.flood_analysis_service import FloodAnalysisService
from app.services.flood_reading_parser import FloodReadingParser
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/cameras", tags=["Cameras"])
gemini_client = GeminiClient()
camera_service_client = CameraServiceClient()
flood_analysis_service = FloodAnalysisService()


class CameraAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Optional base64 JPEG snapshot frame")


def _convert_external_camera(raw: dict) -> CameraResponse:
    """Converts a camera-backend DTO into FloodWheel's CameraResponse model."""
    status_str = "ONLINE" if str(raw.get("status", "")).upper() == "UP" else "OFFLINE"
    return CameraResponse(
        id=str(raw.get("id")),
        name=str(raw.get("name") or raw.get("id")),
        location=str(raw.get("district") or raw.get("name") or "TP. Hồ Chí Minh"),
        latitude=float(raw.get("latitude") or 10.7769),
        longitude=float(raw.get("longitude") or 106.7009),
        camera_angle="elevated",
        stream_url=str(raw.get("snapshot_url") or f"/cameras/{raw.get('id')}/snapshot"),
        video_url=None,
        zone_id=None,
        status=status_str,
        failed_polls_count=0,
        last_polled_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )


@router.get("", response_model=List[CameraResponse])
async def list_cameras(
    zone_id: Optional[str] = None,
    city: Optional[str] = Query("hcmc", description="City filter"),
    district: Optional[str] = Query(None, description="District filter"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve registered and municipal traffic cameras, optionally filtered by zone or district."""
    local_cameras = await CameraRegistry.get_all(db, zone_id=zone_id)
    local_ids = {c.id for c in local_cameras}

    # Query dedicated camera-backend service
    remote_items = await camera_service_client.list_cameras(
        city=city or "hcmc",
        district=district,
        limit=500,
    )

    merged: List[CameraResponse] = []
    for c in local_cameras:
        merged.append(CameraResponse.model_validate(c))

    if remote_items:
        for item in remote_items:
            cam_id = str(item.get("id"))
            if cam_id not in local_ids:
                try:
                    converted = _convert_external_camera(item)
                    merged.append(converted)
                    local_ids.add(cam_id)
                except Exception:
                    pass

    # Attach latest flood readings across all cameras
    latest_readings_stmt = (
        select(FloodReadingDB)
        .distinct(FloodReadingDB.camera_id)
        .order_by(FloodReadingDB.camera_id, FloodReadingDB.timestamp.desc())
    )
    r_res = await db.execute(latest_readings_stmt)
    latest_map = {}
    for r in r_res.scalars().all():
        latest_map[r.camera_id] = FloodReadingSummary(
            flood_detected=r.flood_detected,
            depth_level=r.depth_level,
            depth_estimate_cm_min=r.depth_estimate_cm_min,
            depth_estimate_cm_max=r.depth_estimate_cm_max,
            confidence_score=r.confidence_score,
            alert_message=r.alert_message,
            reasoning=r.reasoning,
            reference_objects=r.get_reference_objects(),
            timestamp=r.timestamp,
        )

    for cam_resp in merged:
        if cam_resp.id in latest_map:
            cam_resp.latest_reading = latest_map[cam_resp.id]

    return merged


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get metadata and current health status for a specific camera."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    resp = None
    if cam:
        resp = CameraResponse.model_validate(cam)
    else:
        external = await camera_service_client.get_camera_by_id(camera_id)
        if external:
            resp = _convert_external_camera(external)

    if resp:
        # Attach latest reading if present
        stmt = (
            select(FloodReadingDB)
            .where(FloodReadingDB.camera_id == camera_id)
            .order_by(FloodReadingDB.timestamp.desc())
            .limit(1)
        )
        res = await db.execute(stmt)
        latest = res.scalars().first()
        if latest:
            resp.latest_reading = FloodReadingSummary(
                flood_detected=latest.flood_detected,
                depth_level=latest.depth_level,
                depth_estimate_cm_min=latest.depth_estimate_cm_min,
                depth_estimate_cm_max=latest.depth_estimate_cm_max,
                confidence_score=latest.confidence_score,
                alert_message=latest.alert_message,
                reasoning=latest.reasoning,
                reference_objects=latest.get_reference_objects(),
                timestamp=latest.timestamp,
            )
        return resp

    raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(
    camera_id: str,
    t: Optional[int] = Query(None, description="Cache buster timestamp"),
    db: AsyncSession = Depends(get_db),
):
    """Proxies the latest image frame from camera-backend or local stream URL."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if cam:
        frame_bytes, content_type = await CameraStreamService.get_snapshot_bytes(
            stream_url=cam.stream_url,
            camera_id=cam.id,
            camera_name=cam.name,
        )
    else:
        # Check camera-backend service directly
        frame_bytes, content_type = await camera_service_client.get_snapshot_bytes(
            camera_id=camera_id,
            camera_name=camera_id,
        )

    return Response(
        content=frame_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=5",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.post("/{camera_id}/analyze", response_model=AnalysisResponse)
async def analyze_camera_snapshot(
    camera_id: str,
    payload: Optional[CameraAnalyzeRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Captures camera frame and executes Gemini Vision VLRDR flood depth analysis."""
    image_b64 = payload.image_base64 if payload else None
    return await flood_analysis_service.analyze_single_camera(
        session=db,
        camera_id=camera_id,
        image_base64=image_b64,
    )


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
@router.post("/admin", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new public traffic camera with stream URL validation and SSRF protection."""
    existing = await CameraRegistry.get_by_id(db, camera_in.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Camera with ID '{camera_in.id}' already exists.")

    # Validate stream URL
    is_valid, error_msg = CameraStreamService.validate_stream_url(camera_in.stream_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid stream URL: {error_msg}")

    return await CameraRegistry.create(db, camera_in)
