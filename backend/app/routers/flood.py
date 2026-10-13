import math
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.db_models import Camera, FloodReadingDB, FloodZone
from app.models.zone_status import ZoneStatus
from app.services.flood_analysis_service import FloodAnalysisService
from app.services.heatmap_builder import HeatmapBuilder
from app.services.zone_aggregator import ZoneAggregator

router = APIRouter(prefix="/flood", tags=["Flood"])
flood_analysis_service = FloodAnalysisService()


class BatchAnalyzeRequest(BaseModel):
    camera_ids: Optional[List[str]] = Field(None, description="Specific camera IDs to analyze")
    district: Optional[str] = Field(None, description="District filter (e.g. 'Quận 1')")
    limit: int = Field(10, ge=1, le=50, description="Max cameras to analyze in this batch")


class EnqueueRequest(BaseModel):
    camera_ids: List[str] = Field(..., min_length=1, description="List of camera IDs to enqueue")


@router.get("/queue/status")
async def get_queue_status() -> Dict[str, Any]:
    """Returns real-time status of the automated background AI flood analysis queue."""
    from app.services.flood_queue_service import flood_queue_service
    return flood_queue_service.get_status()


@router.post("/queue/trigger")
async def trigger_queue_cycle() -> Dict[str, Any]:
    """Forces an immediate analysis cycle across all cameras, skipping 30-minute interval."""
    from app.services.flood_queue_service import flood_queue_service
    status_data = await flood_queue_service.trigger_now()
    return {"success": True, "message": "Queue cycle triggered immediately", "status": status_data}


@router.post("/queue/enqueue")
async def enqueue_cameras_to_queue(req: EnqueueRequest) -> Dict[str, Any]:
    """Enqueues specific cameras into the background processing queue."""
    from app.services.flood_queue_service import flood_queue_service
    added = await flood_queue_service.enqueue_cameras(req.camera_ids)
    return {"success": True, "enqueued_count": added, "status": flood_queue_service.get_status()}


@router.post("/queue/pause")
async def pause_queue() -> Dict[str, Any]:
    """Pauses automated cycles."""
    from app.services.flood_queue_service import flood_queue_service
    status_data = await flood_queue_service.pause()
    return {"success": True, "message": "Queue paused", "status": status_data}


@router.post("/queue/resume")
async def resume_queue() -> Dict[str, Any]:
    """Resumes automated cycles."""
    from app.services.flood_queue_service import flood_queue_service
    status_data = await flood_queue_service.resume()
    return {"success": True, "message": "Queue resumed", "status": status_data}


@router.get("/queue/history")
async def get_queue_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieves paginated AI queue execution history from PostgreSQL."""
    from app.services.flood_queue_service import flood_queue_service
    return await flood_queue_service.get_history(
        session=db,
        page=page,
        page_size=page_size,
        status=status,
        task_type=task_type,
        search=search,
    )


@router.get("/queue/history/{task_id}")
async def get_queue_history_detail(
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieves full audit log details for a specific AI queue task."""
    from app.services.flood_queue_service import flood_queue_service
    detail = await flood_queue_service.get_history_detail(session=db, task_id=task_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tác vụ AI #{task_id}.")
    return {"success": True, "task": detail}


@router.post("/analyze-batch")
async def analyze_batch_cameras(
    req: BatchAnalyzeRequest = BatchAnalyzeRequest(),
    db: AsyncSession = Depends(get_db),
):
    """Executes AI flood depth analysis across a batch of cameras via the central AI Queue."""
    from app.services.flood_queue_service import flood_queue_service
    targets = []
    if req.camera_ids:
        targets = req.camera_ids[:req.limit]
    else:
        remote_cams = await flood_queue_service.camera_service_client.list_cameras(
            district=req.district,
            limit=req.limit * 2,
        )
        if remote_cams:
            targets = [c["id"] for c in remote_cams[:req.limit]]
        else:
            stmt = select(Camera).where(Camera.status != "OFFLINE").limit(req.limit)
            res = await db.execute(stmt)
            targets = [c.id for c in res.scalars().all()]

    results = []
    for cid in targets:
        try:
            res = await flood_queue_service.submit_task(
                task_type="batch_camera",
                source="batch_analyze",
                params={"force_refresh": True},
                camera_id=cid,
                priority=5,
                wait_result=True,
                timeout=60.0,
            )
            is_skipped = (res.model_used == "skipped-default-image")
            results.append({
                "camera_id": cid,
                "success": True,
                "skipped": is_skipped,
                "depth_level": res.reading.depth_level,
                "depth_cm_min": res.reading.depth_estimate_cm_min,
                "depth_cm_max": res.reading.depth_estimate_cm_max,
                "flood_detected": res.reading.flood_detected,
                "alert_message": res.reading.alert_message,
                "model_used": res.model_used,
            })
        except Exception as exc:
            results.append({
                "camera_id": cid,
                "success": False,
                "error": str(exc),
            })

    successful = [r for r in results if r.get("success")]
    flooded_count = sum(1 for r in successful if r.get("flood_detected"))
    max_depth = max([r.get("depth_cm_max", 0) for r in successful] or [0])

    return {
        "success": True,
        "result": {
            "total_analyzed": len(successful),
            "flooded_count": flooded_count,
            "max_depth_cm": max_depth,
            "results": results,
        },
    }



@router.get("/summary")
async def get_flood_summary(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Provides city-wide aggregated flood metrics across monitored cameras and zones."""
    stmt_zones = select(FloodZone)
    z_res = await db.execute(stmt_zones)
    zones = list(z_res.scalars().all())

    stmt_readings = (
        select(FloodReadingDB)
        .distinct(FloodReadingDB.camera_id)
        .order_by(FloodReadingDB.camera_id, FloodReadingDB.timestamp.desc())
    )
    r_res = await db.execute(stmt_readings)
    latest_readings = list(r_res.scalars().all())

    total_cameras = len(latest_readings)
    flooded_cameras = sum(1 for r in latest_readings if (r.depth_level or 0) >= 1)
    severe_flooded = sum(1 for r in latest_readings if (r.depth_level or 0) >= 3)
    max_depth = max([r.depth_estimate_cm_max for r in latest_readings] or [0])

    city_level = 0
    if zones:
        city_level = max([z.current_depth_level or 0 for z in zones] or [0])
    elif latest_readings:
        city_level = max([r.depth_level or 0 for r in latest_readings] or [0])

    status_tag = "NORMAL"
    if city_level >= 3:
        status_tag = "DANGER"
    elif city_level >= 1:
        status_tag = "CAUTION"

    districts = []
    for z in zones:
        districts.append({
            "zone_id": z.id,
            "district": z.district,
            "depth_level": z.current_depth_level,
            "depth_cm_min": z.current_depth_cm_min,
            "depth_cm_max": z.current_depth_cm_max,
            "is_flooded": (z.current_depth_level or 0) >= 2,
            "is_overridden": z.is_overridden,
            "last_updated": z.last_updated_at.isoformat() if z.last_updated_at else None,
        })

    return {
        "status": status_tag,
        "city_flood_level": city_level,
        "monitored_zones_count": len(zones),
        "analyzed_cameras_count": total_cameras,
        "flooded_cameras_count": flooded_cameras,
        "severe_flooded_count": severe_flooded,
        "max_water_depth_cm": max_depth,
        "districts": districts,
        "recent_readings": [
            {
                "camera_id": r.camera_id,
                "depth_level": r.depth_level,
                "depth_cm_min": r.depth_estimate_cm_min,
                "depth_cm_max": r.depth_estimate_cm_max,
                "alert_message": r.alert_message,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in latest_readings[:10]
        ],
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/heatmap")
async def get_heatmap(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Returns GeoJSON FeatureCollection of all monitored flood zones for Mapbox layer rendering."""
    return await HeatmapBuilder.build_geojson(db)


@router.get("/zones", response_model=List[ZoneStatus])
async def list_zones(db: AsyncSession = Depends(get_db)):
    """List current flood statuses for all monitored city zones."""
    stmt = select(FloodZone)
    result = await db.execute(stmt)
    zones = list(result.scalars().all())

    status_list = []
    for z in zones:
        status_list.append(
            ZoneStatus(
                zone_id=z.id,
                zone_name=z.name,
                district=z.district,
                city=z.city,
                depth_level=z.current_depth_level or 0,
                depth_cm_min=z.current_depth_cm_min or 0,
                depth_cm_max=z.current_depth_cm_max or 0,
                confidence_score=0.9,
                is_flooded=(z.current_depth_level or 0) >= 2,
                is_overridden=z.is_overridden,
                last_updated=z.last_updated_at,
            )
        )
    return status_list


@router.get("/zone/{zone_id}")
async def get_zone_detail(zone_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve detailed zone status and historical flood readings for the last 24 hours."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    # Fetch recent readings
    stmt = (
        select(FloodReadingDB)
        .where(FloodReadingDB.zone_id == zone_id)
        .order_by(desc(FloodReadingDB.timestamp))
        .limit(20)
    )
    res = await db.execute(stmt)
    readings = list(res.scalars().all())

    return {
        "zone": {
            "id": zone.id,
            "name": zone.name,
            "district": zone.district,
            "city": zone.city,
            "current_depth_level": zone.current_depth_level,
            "current_depth_cm_min": zone.current_depth_cm_min,
            "current_depth_cm_max": zone.current_depth_cm_max,
            "is_overridden": zone.is_overridden,
            "center": [zone.center_lng, zone.center_lat],
            "last_updated": zone.last_updated_at.isoformat() if zone.last_updated_at else None,
        },
        "history": [
            {
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "depth_level": r.depth_level,
                "depth_cm_min": r.depth_estimate_cm_min,
                "depth_cm_max": r.depth_estimate_cm_max,
                "confidence_score": r.confidence_score,
                "alert_message": r.alert_message,
            }
            for r in readings
        ],
    }


@router.get("/status")
async def get_nearest_flood_status(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(5.0, ge=0.1, le=50.0),
    db: AsyncSession = Depends(get_db),
):
    """Finds the nearest flood zones within radius_km of a user's GPS coordinate."""
    stmt = select(FloodZone)
    result = await db.execute(stmt)
    zones = list(result.scalars().all())

    nearby = []
    for z in zones:
        dist = haversine_distance(lat, lng, z.center_lat, z.center_lng)
        if dist <= radius_km:
            nearby.append({
                "zone_id": z.id,
                "name": z.name,
                "distance_km": round(dist, 2),
                "depth_level": z.current_depth_level,
                "depth_cm_min": z.current_depth_cm_min,
                "depth_cm_max": z.current_depth_cm_max,
                "is_flooded": (z.current_depth_level or 0) >= 2,
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return {
        "query_location": {"lat": lat, "lng": lng},
        "nearby_zones": nearby,
    }
