import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.db_models import FloodReadingDB, FloodZone
from app.services.camera_registry import CameraRegistry
from app.services.flood_queue_service import flood_queue_service
from app.services.zone_aggregator import ZoneAggregator

logger = logging.getLogger("floodwheel.admin_readings")
router = APIRouter()


@router.delete("/readings")
async def clear_all_ai_readings(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Deletes all AI flood readings and resets flood zones to normal level 0."""
    count_stmt = select(func.count(FloodReadingDB.id))
    total_count = (await db.execute(count_stmt)).scalar() or 0

    await db.execute(delete(FloodReadingDB))

    zone_stmt = select(FloodZone).where(FloodZone.is_overridden == False)
    zone_res = await db.execute(zone_stmt)
    zones = zone_res.scalars().all()
    now = datetime.now(timezone.utc)
    for z in zones:
        z.current_depth_level = 0
        z.current_depth_cm_min = 0
        z.current_depth_cm_max = 0
        z.last_updated_at = now

    await db.commit()

    queue_cleared = flood_queue_service.clear_recent_results()
    logger.info("Admin %s cleared all %d AI readings and %d queue results.", current_admin.username, total_count, queue_cleared)
    return {
        "success": True,
        "deleted_count": total_count,
        "queue_cleared_count": queue_cleared,
        "zones_reset_count": len(zones),
        "message": f"Đã xóa toàn bộ {total_count} kết quả phân tích AI và đặt lại trạng thái các khu vực.",
    }


@router.delete("/cameras/{camera_id}/readings")
async def delete_camera_ai_readings(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Deletes all AI flood analysis readings for a specific camera and updates zone status."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    zone_id = cam.zone_id if cam else None

    if not zone_id:
        sample_stmt = select(FloodReadingDB.zone_id).where(FloodReadingDB.camera_id == camera_id).limit(1)
        zone_id = (await db.execute(sample_stmt)).scalar()

    count_stmt = select(func.count(FloodReadingDB.id)).where(FloodReadingDB.camera_id == camera_id)
    deleted_count = (await db.execute(count_stmt)).scalar() or 0

    await db.execute(delete(FloodReadingDB).where(FloodReadingDB.camera_id == camera_id))

    if zone_id:
        zone = await db.get(FloodZone, zone_id)
        if zone and not zone.is_overridden:
            recent_stmt = (
                select(FloodReadingDB)
                .where(FloodReadingDB.zone_id == zone_id)
                .order_by(FloodReadingDB.timestamp.desc())
                .limit(10)
            )
            r_res = await db.execute(recent_stmt)
            recent_readings = list(r_res.scalars().all())
            if not recent_readings:
                zone.current_depth_level = 0
                zone.current_depth_cm_min = 0
                zone.current_depth_cm_max = 0
                zone.last_updated_at = datetime.now(timezone.utc)
            else:
                await ZoneAggregator.aggregate_zone(db, zone, recent_readings)

    await db.commit()
    flood_queue_service.remove_recent_result(camera_id)

    logger.info("Admin %s deleted %d AI readings for camera %s", current_admin.username, deleted_count, camera_id)
    return {
        "success": True,
        "camera_id": camera_id,
        "deleted_count": deleted_count,
        "message": f"Đã xóa {deleted_count} kết quả phân tích AI của camera '{camera_id}'.",
    }


@router.delete("/readings/{reading_id}")
async def delete_single_ai_reading(
    reading_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Deletes a specific AI flood reading by ID and updates zone status."""
    reading = await db.get(FloodReadingDB, reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy kết quả phân tích #{reading_id}.")

    zone_id = reading.zone_id
    camera_id = reading.camera_id

    await db.delete(reading)

    if zone_id:
        zone = await db.get(FloodZone, zone_id)
        if zone and not zone.is_overridden:
            recent_stmt = (
                select(FloodReadingDB)
                .where(FloodReadingDB.zone_id == zone_id)
                .order_by(FloodReadingDB.timestamp.desc())
                .limit(10)
            )
            r_res = await db.execute(recent_stmt)
            recent_readings = list(r_res.scalars().all())
            if not recent_readings:
                zone.current_depth_level = 0
                zone.current_depth_cm_min = 0
                zone.current_depth_cm_max = 0
                zone.last_updated_at = datetime.now(timezone.utc)
            else:
                await ZoneAggregator.aggregate_zone(db, zone, recent_readings)

    await db.commit()

    return {
        "success": True,
        "deleted_id": reading_id,
        "camera_id": camera_id,
        "message": f"Đã xóa kết quả phân tích #{reading_id}.",
    }
