import base64
from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.camera import CameraCreate, CameraResponse
from app.models.db_models import FloodReadingDB, FloodZone
from app.models.flood_reading import AnalysisResponse
from app.services.camera_registry import CameraRegistry
from app.services.camera_stream_service import CameraStreamService
from app.services.flood_reading_parser import FloodReadingParser
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/cameras", tags=["Cameras"])
gemini_client = GeminiClient()


class CameraAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Optional base64 JPEG captured directly from live video stream")


@router.get("", response_model=List[CameraResponse])
async def list_cameras(
    zone_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all registered traffic cameras, optionally filtered by zone."""
    cameras = await CameraRegistry.get_all(db, zone_id=zone_id)
    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get metadata and current health status for a specific camera."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")
    return cam


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(
    camera_id: str,
    t: Optional[int] = Query(None, description="Cache buster timestamp"),
    db: AsyncSession = Depends(get_db),
):
    """Proxies the latest image frame from the camera's stream URL with 5-second caching."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")

    frame_bytes, content_type = await CameraStreamService.get_snapshot_bytes(
        stream_url=cam.stream_url,
        camera_id=cam.id,
        camera_name=cam.name,
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
    """Captures the active camera frame (or uses client video capture) and executes Gemini Vision VLRDR flood depth analysis."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")

    # 1. Grab frame: either from client-uploaded frame (canvas capture from live video) or backend proxy
    frame_bytes = None
    if payload and payload.image_base64:
        try:
            raw_b64 = payload.image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            frame_bytes = base64.b64decode(raw_b64)
        except Exception:
            frame_bytes = None

    if not frame_bytes or len(frame_bytes) < 100:
        frame_bytes, _ = await CameraStreamService.get_snapshot_bytes(
            stream_url=cam.stream_url,
            camera_id=cam.id,
            camera_name=cam.name,
            force_refresh=True,
        )

    # 2. Invoke Gemini Vision AI analysis
    raw_text, model_used, elapsed, tokens = await gemini_client.analyze_image_bytes(
        image_bytes=frame_bytes,
        camera_angle=cam.camera_angle or "elevated",
        location_hint=cam.location or cam.name,
    )

    # 3. Parse VLRDR response schema
    reading = FloodReadingParser.parse(
        raw_text=raw_text,
        camera_id=cam.id,
    )

    # 4. Persist reading to database
    db_reading = FloodReadingDB(
        camera_id=cam.id,
        zone_id=cam.zone_id,
        timestamp=datetime.now(timezone.utc),
        flood_detected=reading.flood_detected,
        confidence_score=reading.confidence_score,
        depth_level=reading.depth_level,
        depth_estimate_cm_min=reading.depth_estimate_cm_min,
        depth_estimate_cm_max=reading.depth_estimate_cm_max,
        reference_objects=json.dumps(reading.reference_objects_used or []),
        reasoning=reading.reasoning,
        alert_message=reading.alert_message,
    )
    db.add(db_reading)

    # 5. Update associated zone depth level if assigned
    if cam.zone_id and reading.depth_level is not None:
        zone = await db.get(FloodZone, cam.zone_id)
        if zone:
            zone.current_depth_level = reading.depth_level
            zone.current_depth_cm_min = reading.depth_estimate_cm_min
            zone.current_depth_cm_max = reading.depth_estimate_cm_max
            zone.last_updated_at = datetime.now(timezone.utc)

    await db.commit()

    return AnalysisResponse(
        success=True,
        reading=reading,
        inference_time_ms=round(elapsed * 1000, 1),
        model_used=model_used,
        tokens_used=tokens,
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
