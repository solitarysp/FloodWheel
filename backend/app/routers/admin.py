from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.db_models import FloodZone, OperatorOverride

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


class OverrideRequest(BaseModel):
    operator_id: str = Field(..., max_length=64)
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


@router.put("/zones/{zone_id}/override", response_model=OverrideResponse)
async def set_zone_override(
    zone_id: str,
    req: OverrideRequest,
    db: AsyncSession = Depends(get_db),
):
    """Sets a manual operator override on a specific flood zone."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=req.duration_hours)

    override = OperatorOverride(
        zone_id=zone_id,
        operator_id=req.operator_id,
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
        message=f"Manual override set to Level {req.override_depth_level} until {expires_at.isoformat()}.",
    )


@router.delete("/zones/{zone_id}/override")
async def cancel_zone_override(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Cancels an active operator override and returns zone to AI-driven automated state."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    zone.is_overridden = False
    zone.last_updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"success": True, "zone_id": zone_id, "message": "Override cancelled. Automated AI mode restored."}


@router.post("/poll-cycle")
async def trigger_poll_cycle():
    """Manually triggers an immediate end-to-end camera polling and AI analysis cycle."""
    from app.services.polling_scheduler import PollingScheduler

    scheduler = PollingScheduler()
    result = await scheduler.run_single_poll_cycle()
    return {"success": True, "result": result}

