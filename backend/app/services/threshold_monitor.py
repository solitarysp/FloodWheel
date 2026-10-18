from datetime import datetime, timezone
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Alert, FloodZone
from app.models.zone_status import ZoneStatus
from app.services.dedup_guard import dedup_guard
from app.services.webhook_delivery import webhook_delivery

logger = logging.getLogger(__name__)


class ThresholdMonitor:
    """Monitors zone status changes against critical flood thresholds."""

    CRITICAL_THRESHOLD_LEVEL = 3  # Level 3: exhaust pipe submerged (30-45cm)

    @classmethod
    async def evaluate_zone(
        cls,
        session: AsyncSession,
        zone: FloodZone,
        new_status: ZoneStatus,
    ) -> Optional[Alert]:
        """Evaluates zone and triggers alert or recovery notification."""
        level = new_status.depth_level

        # Trigger critical flood alert
        if level >= cls.CRITICAL_THRESHOLD_LEVEL:
            if dedup_guard.should_send(zone.id, level):
                message = (
                    f"CRITICAL FLOOD ALERT: {zone.name} is at Flood Level {level} "
                    f"({new_status.depth_cm_min}-{new_status.depth_cm_max}cm). "
                    f"Motorcycle exhaust pipes are submerged. Route impassable for two-wheelers!"
                )
                alert = Alert(
                    zone_id=zone.id,
                    level=level,
                    message=message,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(alert)
                await session.commit()

                # Broadcast to partner webhooks
                await webhook_delivery.broadcast_alert({
                    "event": "FLOOD_ALERT_TRIGGERED",
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "depth_level": level,
                    "depth_cm_min": new_status.depth_cm_min,
                    "depth_cm_max": new_status.depth_cm_max,
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                logger.info(f"Triggered flood alert for zone {zone.id} (Level {level})")
                return alert

        # Zone recovered to dry or minor puddles
        elif level <= 1:
            stmt = select(Alert).where(Alert.zone_id == zone.id, Alert.is_active == True)
            res = await session.execute(stmt)
            active_alerts = list(res.scalars().all())

            if active_alerts:
                now = datetime.now(timezone.utc)
                for a in active_alerts:
                    a.is_active = False
                    a.resolved_at = now
                await session.commit()
                dedup_guard.clear(zone.id)

                await webhook_delivery.broadcast_alert({
                    "event": "FLOOD_ALERT_RESOLVED",
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "message": f"{zone.name} floodwaters receded (Level {level}). Route is now safe.",
                    "timestamp": now.isoformat(),
                })
                logger.info(f"Resolved active alerts for zone {zone.id}")

        return None
