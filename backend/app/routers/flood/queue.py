from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.db_models import Camera
from app.schemas.flood import BatchAnalyzeRequest, EnqueueRequest

router = APIRouter()


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
