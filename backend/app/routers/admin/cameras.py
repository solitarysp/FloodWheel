import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.camera import CameraCreate, CameraResponse
from app.models.flood_reading import AnalysisResponse
from app.schemas.admin import CameraBatchAnalyzeRequest, CameraStatusUpdateRequest
from app.services.camera_registry import CameraRegistry
from app.services.camera_stream_service import CameraStreamService
from app.services.flood_queue_service import flood_queue_service

logger = logging.getLogger("floodwheel.admin_cameras")
router = APIRouter()


@router.post("/cameras", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Registers a new traffic camera into the municipal catalog."""
    existing = await CameraRegistry.get_by_id(db, camera_in.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Camera với ID '{camera_in.id}' đã tồn tại.")

    is_valid, error_msg = CameraStreamService.validate_stream_url(camera_in.stream_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Stream URL không hợp lệ: {error_msg}")

    return await CameraRegistry.create(db, camera_in)


@router.patch("/cameras/{camera_id}/status")
async def update_camera_status(
    camera_id: str,
    req: CameraStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Updates operational status of a camera (ONLINE, OFFLINE, MAINTENANCE)."""
    valid_statuses = {"ONLINE", "OFFLINE", "MAINTENANCE"}
    new_status = req.status.upper().strip()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ. Cho phép: {valid_statuses}")

    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' không tìm thấy.")

    cam.status = new_status
    await db.commit()
    return {
        "success": True,
        "camera_id": camera_id,
        "status": new_status,
        "message": f"Đã cập nhật trạng thái camera '{camera_id}' thành {new_status}.",
    }


@router.delete("/cameras/{camera_id}")
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Deletes a camera from the local registry."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' không tìm thấy.")

    await db.delete(cam)
    await db.commit()
    return {
        "success": True,
        "camera_id": camera_id,
        "message": f"Đã xóa camera '{camera_id}' thành công.",
    }


@router.post("/cameras/analyze-batch")
async def admin_analyze_batch_cameras(
    req: CameraBatchAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Triggers immediate on-demand AI flood analysis for 1 or N specified cameras."""
    results = []
    analyzed_count = 0
    skipped_count = 0
    error_count = 0

    for cam_id in req.camera_ids:
        try:
            res: AnalysisResponse = await flood_queue_service.submit_task(
                task_type="batch_camera",
                source="admin_dashboard",
                params={"force_refresh": req.force_refresh},
                camera_id=cam_id,
                priority=5,
                wait_result=True,
                timeout=60.0,
            )
            is_skipped = (res.model_used == "skipped-default-image")
            if is_skipped:
                skipped_count += 1
                results.append({
                    "camera_id": cam_id,
                    "success": True,
                    "skipped": True,
                    "reason": "Đang chờ ảnh từ cam",
                    "depth_level": 0,
                    "water_depth_cm": 0,
                    "alert_message": res.reading.alert_message,
                })
            else:
                analyzed_count += 1
                results.append({
                    "camera_id": cam_id,
                    "success": True,
                    "skipped": False,
                    "depth_level": res.reading.depth_level,
                    "water_depth_cm": (
                        getattr(res.reading, "water_depth_cm", None)
                        or res.reading.depth_estimate_cm_max
                        or 0
                    ),
                    "depth_cm_min": res.reading.depth_estimate_cm_min,
                    "depth_cm_max": res.reading.depth_estimate_cm_max,
                    "alert_message": res.reading.alert_message,
                    "model_used": res.model_used,
                })
        except Exception as exc:
            logger.error("Failed to analyze camera %s in batch: %s", cam_id, exc)
            error_count += 1
            results.append({
                "camera_id": cam_id,
                "success": False,
                "skipped": False,
                "error": str(exc),
            })

    return {
        "success": True,
        "total": len(req.camera_ids),
        "analyzed_count": analyzed_count,
        "skipped_count": skipped_count,
        "error_count": error_count,
        "results": results,
    }


@router.post("/cameras/{camera_id}/analyze")
async def admin_analyze_single_camera(
    camera_id: str,
    force_refresh: bool = Query(True, description="Bắt buộc quét mới"),
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Triggers immediate on-demand AI flood analysis for a single camera via AI Queue."""
    res: AnalysisResponse = await flood_queue_service.submit_task(
        task_type="single_camera",
        source="admin_dashboard",
        params={"force_refresh": force_refresh},
        camera_id=camera_id,
        priority=1,
        wait_result=True,
        timeout=60.0,
    )
    is_skipped = (res.model_used == "skipped-default-image")
    return {
        "success": True,
        "camera_id": camera_id,
        "skipped": is_skipped,
        "reason": "Đang chờ ảnh từ cam" if is_skipped else None,
        "depth_level": res.reading.depth_level,
        "depth_cm_min": res.reading.depth_estimate_cm_min,
        "depth_cm_max": res.reading.depth_estimate_cm_max,
        "alert_message": res.reading.alert_message,
        "model_used": res.model_used,
        "reading": res.reading.model_dump(mode="json") if hasattr(res.reading, "model_dump") else None,
    }
