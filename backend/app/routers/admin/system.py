import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.db_models import Alert, Camera, FloodZone
from app.schemas.admin import AdminLoginRequest, AdminLoginResponse, AdminUserResponse
from app.services.auth_service import auth_service
from app.services.flood_queue_service import flood_queue_service

logger = logging.getLogger("floodwheel.admin_system")
router = APIRouter()


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


@router.get("/overview")
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Provides high-level administration overview and health telemetry."""
    cam_stmt = select(Camera.status, func.count(Camera.id)).group_by(Camera.status)
    cam_res = await db.execute(cam_stmt)
    status_counts = dict(cam_res.all())
    total_cameras = sum(status_counts.values())

    zone_total = (await db.execute(select(func.count(FloodZone.id)))).scalar() or 0
    zone_overridden = (await db.execute(select(func.count(FloodZone.id)).where(FloodZone.is_overridden == True))).scalar() or 0

    active_alerts = (await db.execute(select(func.count(Alert.id)).where(Alert.is_active == True))).scalar() or 0

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
            "gemini_base_url": getattr(settings, "GEMINI_BASE_URL", None),
            "queue_interval_minutes": getattr(settings, "FLOOD_QUEUE_INTERVAL_MINUTES", 30),
            "queue_auto_start": getattr(settings, "FLOOD_QUEUE_AUTO_START", False),
        },
    }
