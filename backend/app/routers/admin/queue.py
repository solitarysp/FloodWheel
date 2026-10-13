import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.schemas.admin import QueueConfigRequest
from app.services.flood_queue_service import flood_queue_service

logger = logging.getLogger("floodwheel.admin_queue")
router = APIRouter()


@router.post("/poll-cycle")
@router.post("/queue/trigger")
async def trigger_poll_cycle(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Manually triggers an immediate end-to-end camera polling and AI analysis cycle."""
    status_data = await flood_queue_service.trigger_now()
    return {
        "success": True,
        "message": "Đã kích hoạt chu kỳ quét phân tích ngập AI ngay lập tức.",
        "result": status_data,
    }


@router.post("/queue/pause")
async def pause_flood_queue(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Pauses automated cyclical AI scans."""
    status_data = await flood_queue_service.pause()
    return {
        "success": True,
        "message": "Đã tạm dừng hàng đợi quét tự động.",
        "result": status_data,
    }


@router.post("/queue/resume")
async def resume_flood_queue(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Resumes automated cyclical AI scans."""
    status_data = await flood_queue_service.resume()
    return {
        "success": True,
        "message": "Đã tiếp tục hàng đợi quét tự động.",
        "result": status_data,
    }


@router.patch("/queue/config")
async def update_queue_config(
    req: QueueConfigRequest,
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Adjusts cycle interval or camera count limits for the queue scheduler."""
    if req.interval_minutes is not None:
        flood_queue_service.interval_seconds = req.interval_minutes * 60
    if req.max_cameras_per_cycle is not None:
        flood_queue_service.max_cameras_per_cycle = req.max_cameras_per_cycle
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình hàng đợi AI.",
        "interval_minutes": flood_queue_service.interval_seconds // 60,
        "max_cameras_per_cycle": flood_queue_service.max_cameras_per_cycle,
    }


@router.get("/queue/history")
async def get_admin_queue_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Retrieves paginated AI queue history from PostgreSQL for the Admin Monitor."""
    return await flood_queue_service.get_history(
        session=db,
        page=page,
        page_size=page_size,
        status=status,
        task_type=task_type,
        search=search,
    )


@router.get("/queue/history/{task_id}")
async def get_admin_queue_history_detail(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Retrieves complete audit details for a specific AI queue task."""
    detail = await flood_queue_service.get_history_detail(session=db, task_id=task_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tác vụ AI #{task_id}.")
    return {"success": True, "task": detail}


@router.delete("/queue/history")
async def clear_admin_queue_history(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Purges all AI queue execution history from PostgreSQL database."""
    deleted_count = await flood_queue_service.clear_history(session=db)
    flood_queue_service.clear_recent_results()
    logger.info("Admin %s cleared %d AI queue task history records.", current_admin.username, deleted_count)
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Đã xóa {deleted_count} bản ghi lịch sử hàng đợi AI trong database.",
    }
