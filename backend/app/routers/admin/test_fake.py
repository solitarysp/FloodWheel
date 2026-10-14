"""Temporary test endpoints for simulating randomized flood readings on cameras."""

from datetime import datetime, timezone
import json
import logging
import random
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import AdminUser, get_current_admin
from app.models.db_models import Camera, FloodReadingDB, FloodZone
from app.services.flood_queue_service import flood_queue_service
from app.services.zone_aggregator import ZoneAggregator

logger = logging.getLogger("floodwheel.admin_test_fake")
router = APIRouter()


@router.post("/test/fake-random-flood")
async def fake_random_flood_readings(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """[TEMPORARY TEST ENDPOINT] Generates randomized flood and non-flood readings across cameras.

    NOTE: This endpoint is strictly for testing/demos and can be removed in the future.
    """
    cameras_stmt = select(Camera).limit(100)
    res = await db.execute(cameras_stmt)
    cameras = list(res.scalars().all())

    if not cameras:
        return {"success": False, "message": "No cameras found in database to simulate readings."}

    now = datetime.now(timezone.utc)
    created_count = 0
    flooded_count = 0
    zones_to_update = set()

    # Define realistic water level profiles for simulation
    flood_profiles = [
        {"depth_level": 1, "min_cm": 10, "max_cm": 25, "reason": "Puddle accumulation observed near street curb (10-25cm depth)."},
        {"depth_level": 2, "min_cm": 25, "max_cm": 45, "reason": "Water reaches halfway up motorcycle wheel hubs (25-45cm depth)."},
        {"depth_level": 3, "min_cm": 45, "max_cm": 70, "reason": "Severe roadway submergence above exhaust pipes and car door sills (45-70cm depth)."},
    ]

    for cam in cameras:
        # 50% chance of flood vs 50% chance of clear/dry
        is_flood = random.random() < 0.50

        if is_flood:
            profile = random.choice(flood_profiles)
            depth_lvl = profile["depth_level"]
            min_cm = profile["min_cm"]
            max_cm = profile["max_cm"]
            reasoning = profile["reason"]
            alert_msg = f"Cảnh báo ngập {min_cm}-{max_cm}cm tại {cam.name}."
            flooded_count += 1
        else:
            depth_lvl = 0
            min_cm = 0
            max_cm = 0
            reasoning = "Road surface is dry. Traffic moving smoothly without water obstruction."
            alert_msg = f"Tuyến đường {cam.name} khô ráo, không ghi nhận ngập nước."

        reading = FloodReadingDB(
            camera_id=cam.id,
            zone_id=cam.zone_id,
            timestamp=now,
            flood_detected=is_flood,
            confidence_score=round(random.uniform(0.85, 0.98), 2),
            depth_level=depth_lvl,
            depth_estimate_cm_min=min_cm,
            depth_estimate_cm_max=max_cm,
            reference_objects=json.dumps(["motorcycle_wheel", "curb", "car_tire"]),
            reasoning=f"[TEST SIMULATION] {reasoning}",
            alert_message=alert_msg,
        )
        db.add(reading)
        created_count += 1

        # Also push to queue service recent results cache for real-time frontend observation
        flood_queue_service._record_result({
            "camera_id": cam.id,
            "camera_name": cam.name,
            "task_id": f"test_sim_{cam.id[:8]}",
            "cycle_id": 9999,
            "flood_detected": is_flood,
            "depth_level": depth_lvl,
            "depth_cm": f"{min_cm}-{max_cm} cm" if is_flood else "0 cm",
            "confidence": reading.confidence_score,
            "processed_at": now.isoformat(),
        })

        if cam.zone_id:
            zones_to_update.add(cam.zone_id)

    # Re-aggregate affected zones
    for zone_id in zones_to_update:
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
            await ZoneAggregator.aggregate_zone(db, zone, recent_readings)

    await db.commit()

    logger.info("Admin %s generated %d fake test readings (%d flooded) across %d zones", current_admin.username, created_count, flooded_count, len(zones_to_update))
    return {
        "success": True,
        "total_generated": created_count,
        "flooded_count": flooded_count,
        "dry_count": created_count - flooded_count,
        "zones_updated": len(zones_to_update),
        "message": f"[TEST] Đã tạo ngẫu nhiên {created_count} kết quả giả lập ({flooded_count} cảnh báo ngập, {created_count - flooded_count} an toàn).",
    }
