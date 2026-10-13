from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.db_models import Alert, FloodZone, OperatorOverride
from app.schemas.admin import OverrideRequest, OverrideResponse

router = APIRouter()


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
