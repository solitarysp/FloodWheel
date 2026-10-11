"""Admin Operations & Control Router.

Provides administration endpoints for:
1. Admin authentication (Login, Token Generation, Profile verification).
2. AI Background Analysis Queue controls (Trigger, Pause, Resume, Reconfigure).
3. Public Traffic Camera management (Add, Update status, Delete).
4. Flood Zone Manual Overrides (Set emergency depth level, Cancel override).
5. Active Flood Alerts monitoring & resolution.
6. Real-time aggregated system overview & telemetry.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.camera import CameraCreate, CameraResponse
from app.models.db_models import Alert, Camera, FloodReadingDB, FloodZone, OperatorOverride
from app.services.auth_service import auth_service
from app.services.camera_registry import CameraRegistry
from app.services.camera_stream_service import CameraStreamService
from app.services.flood_analysis_service import FloodAnalysisService
from app.services.flood_queue_service import flood_queue_service

logger = logging.getLogger("floodwheel.admin_router")
router = APIRouter(prefix="/admin", tags=["Admin Operations"])
flood_analysis_service = FloodAnalysisService()


# ===================== SCHEMAS =====================

class AdminLoginRequest(BaseModel):
    username: str = Field(..., description="Tên đăng nhập quản trị viên")
    password: str = Field(..., description="Mật khẩu quản trị")


class AdminUserResponse(BaseModel):
    username: str
    role: str
    logged_in_at: datetime


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: AdminUserResponse


class OverrideRequest(BaseModel):
    operator_id: Optional[str] = Field("admin", max_length=64)
    override_depth_level: int = Field(..., ge=0, le=5)
    depth_cm_min: int = Field(0, ge=0)
    depth_cm_max: int = Field(0, ge=0)
    reason: str = Field(..., max_length=255)
    duration_hours: int = Field(2, ge=1, le=24)


class OverrideResponse(BaseModel):
    success: bool
    zone_id: str
    override_depth_level: int
    expires_at: datetime
    message: str


class CameraStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="ONLINE | OFFLINE | MAINTENANCE")


class QueueConfigRequest(BaseModel):
    interval_minutes: Optional[int] = Field(None, ge=1, le=120)
    max_cameras_per_cycle: Optional[int] = Field(None, ge=1, le=200)


class CameraBatchAnalyzeRequest(BaseModel):
    camera_ids: List[str] = Field(..., min_length=1, max_length=100, description="Danh sách ID camera cần phân tích")
    force_refresh: bool = Field(True, description="Bắt buộc quét mới, bỏ qua cache AI gần nhất")


# ===================== AUTHENTICATION =====================

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(req: AdminLoginRequest):
    """Authenticates admin credentials and returns an HS256 Bearer access token."""
    expected_username = settings.ADMIN_USERNAME
    expected_password = settings.ADMIN_PASSWORD

    is_valid_user = (req.username.strip() == expected_username)
    is_valid_pwd = auth_service.verify_password(req.password, expected_password)

    if not (is_valid_user and is_valid_pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác.",
        )

    expires_hours = getattr(settings, "ADMIN_TOKEN_EXPIRE_HOURS", 24)
    token = auth_service.create_access_token(
        subject=req.username,
        role="admin",
        expires_delta=timedelta(hours=expires_hours),
    )

    now = datetime.now(timezone.utc)
    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_hours * 3600,
        user=AdminUserResponse(
            username=req.username,
            role="admin",
            logged_in_at=now,
        ),
    )


@router.get("/me", response_model=AdminUserResponse)
async def get_admin_profile(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Returns profile and permissions of the currently authenticated admin."""
    return AdminUserResponse(
        username=current_admin.username,
        role=current_admin.role,
        logged_in_at=datetime.now(timezone.utc),
    )


# ===================== OVERVIEW & TELEMETRY =====================

@router.get("/overview")
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Provides high-level administration overview and health telemetry."""
    # Camera counts
    cam_stmt = select(Camera.status, func.count(Camera.id)).group_by(Camera.status)
    cam_res = await db.execute(cam_stmt)
    status_counts = dict(cam_res.all())
    total_cameras = sum(status_counts.values())

    # Zones count and overrides
    zone_total = (await db.execute(select(func.count(FloodZone.id)))).scalar() or 0
    zone_overridden = (await db.execute(select(func.count(FloodZone.id)).where(FloodZone.is_overridden == True))).scalar() or 0

    # Active alerts
    active_alerts = (await db.execute(select(func.count(Alert.id)).where(Alert.is_active == True))).scalar() or 0

    # Queue status
    queue_state = flood_queue_service.get_status()

    return {
        "success": True,
        "operator": current_admin.username,
        "cameras": {
            "total": total_cameras,
            "online": status_counts.get("ONLINE", 0),
            "offline": status_counts.get("OFFLINE", 0),
            "maintenance": status_counts.get("MAINTENANCE", 0),
        },
        "zones": {
            "total": zone_total,
            "overridden": zone_overridden,
        },
        "alerts": {
            "active_count": active_alerts,
        },
        "queue": queue_state,
        "environment": {
            "env": settings.ENVIRONMENT,
            "gemini_model": settings.GEMINI_MODEL,
            "queue_interval_minutes": getattr(settings, "FLOOD_QUEUE_INTERVAL_MINUTES", 30),
            "queue_auto_start": getattr(settings, "FLOOD_QUEUE_AUTO_START", False),
        },
    }


# ===================== AI QUEUE CONTROLS =====================

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
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình hàng đợi AI.",
        "interval_minutes": flood_queue_service.interval_seconds // 60,
    }


# ===================== CAMERA MANAGEMENT =====================

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
            res = await flood_analysis_service.analyze_single_camera(
                session=db,
                camera_id=cam_id,
                force_refresh=req.force_refresh,
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
    """Triggers immediate on-demand AI flood analysis for a single camera."""
    res = await flood_analysis_service.analyze_single_camera(
        session=db,
        camera_id=camera_id,
        force_refresh=force_refresh,
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


# ===================== ZONE OVERRIDES =====================

@router.get("/zones")
async def list_admin_zones(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Lists all monitored flood zones and their active override status."""
    stmt = select(FloodZone).order_by(FloodZone.district, FloodZone.name)
    res = await db.execute(stmt)
    zones = res.scalars().all()
    return {
        "success": True,
        "items": [
            {
                "id": z.id,
                "name": z.name,
                "district": z.district,
                "current_depth_level": z.current_depth_level,
                "current_depth_cm_min": z.current_depth_cm_min,
                "current_depth_cm_max": z.current_depth_cm_max,
                "is_overridden": z.is_overridden,
                "last_updated_at": z.last_updated_at.isoformat() if z.last_updated_at else None,
            }
            for z in zones
        ],
    }


@router.put("/zones/{zone_id}/override", response_model=OverrideResponse)
async def set_zone_override(
    zone_id: str,
    req: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Sets a manual operator override on a specific flood zone."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Khu vực '{zone_id}' không tồn tại.")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=req.duration_hours)

    override = OperatorOverride(
        zone_id=zone_id,
        operator_id=req.operator_id or current_admin.username,
        override_depth_level=req.override_depth_level,
        reason=req.reason,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
    )
    db.add(override)

    # Update zone
    zone.is_overridden = True
    zone.current_depth_level = req.override_depth_level
    zone.current_depth_cm_min = req.depth_cm_min
    zone.current_depth_cm_max = req.depth_cm_max
    zone.last_updated_at = datetime.now(timezone.utc)

    await db.commit()

    return OverrideResponse(
        success=True,
        zone_id=zone_id,
        override_depth_level=req.override_depth_level,
        expires_at=expires_at,
        message=f"Đã ghi đè thủ công mức ngập Level {req.override_depth_level} đến {expires_at.strftime('%H:%M %d/%m/%Y')}.",
    )


@router.delete("/zones/{zone_id}/override")
async def cancel_zone_override(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Cancels an active operator override and returns zone to AI-driven automated state."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Khu vực '{zone_id}' không tồn tại.")

    zone.is_overridden = False
    zone.last_updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "success": True,
        "zone_id": zone_id,
        "message": "Đã hủy ghi đè thủ công. Đã khôi phục chế độ tự động AI.",
    }


# ===================== ALERTS MANAGEMENT =====================

@router.get("/alerts")
async def list_admin_alerts(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Lists recent flood alerts with active status."""
    stmt = select(Alert).order_by(Alert.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    alerts = res.scalars().all()
    return {
        "success": True,
        "items": [
            {
                "id": a.id,
                "zone_id": a.zone_id,
                "level": a.level,
                "message": a.message,
                "is_active": a.is_active,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            }
            for a in alerts
        ],
    }


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Marks an active flood alert as resolved."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Cảnh báo #{alert_id} không tồn tại.")

    alert.is_active = False
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {
        "success": True,
        "alert_id": alert_id,
        "message": f"Cảnh báo #{alert_id} đã được đánh dấu là đã giải quyết.",
    }
