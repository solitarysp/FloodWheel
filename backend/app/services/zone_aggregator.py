from datetime import datetime, timezone
import statistics
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import FloodReadingDB, FloodZone
from app.models.zone_status import ZoneStatus


class ZoneAggregator:
    """Aggregates per-camera readings into zone-level flood assessments."""

    @staticmethod
    def apply_time_decay(confidence: float, timestamp: datetime, now: datetime) -> float:
        """Decays confidence for readings over 15 and 25 minutes old."""
        age_seconds = (now - timestamp).total_seconds()
        age_minutes = age_seconds / 60.0

        if age_minutes > 25.0:
            return round(confidence * 0.4, 2)
        elif age_minutes > 15.0:
            return round(confidence * 0.7, 2)
        return confidence

    @classmethod
    async def aggregate_zone(
        cls,
        session: AsyncSession,
        zone: FloodZone,
        recent_readings: List[FloodReadingDB],
    ) -> ZoneStatus:
        """Computes confidence-weighted median depth level and updates zone."""
        now = datetime.now(timezone.utc)

        if not recent_readings:
            # Fallback to current database state
            return ZoneStatus(
                zone_id=zone.id,
                zone_name=zone.name,
                district=zone.district,
                city=zone.city,
                depth_level=zone.current_depth_level,
                depth_cm_min=zone.current_depth_cm_min,
                depth_cm_max=zone.current_depth_cm_max,
                confidence_score=0.85,
                is_flooded=zone.current_depth_level >= 2,
                is_overridden=zone.is_overridden,
                cameras_reporting=0,
                active_alerts=[],
                last_updated=zone.last_updated_at or now,
            )

        weighted_levels = []
        cm_mins = []
        cm_maxs = []
        weights = []

        for reading in recent_readings:
            if reading.depth_level is not None:
                decayed_conf = cls.apply_time_decay(reading.confidence_score, reading.timestamp, now)
                # Expand weights into frequency list
                repeat_count = max(1, int(decayed_conf * 10))
                weighted_levels.extend([reading.depth_level] * repeat_count)
                cm_mins.append(reading.depth_estimate_cm_min)
                cm_maxs.append(reading.depth_estimate_cm_max)
                weights.append(decayed_conf)

        if weighted_levels:
            median_level = int(statistics.median(weighted_levels))
            avg_min = int(statistics.mean(cm_mins))
            avg_max = int(statistics.mean(cm_maxs))
            avg_conf = round(sum(weights) / len(weights), 2)
        else:
            median_level = zone.current_depth_level
            avg_min = zone.current_depth_cm_min
            avg_max = zone.current_depth_cm_max
            avg_conf = 0.5

        # If manual operator override is active, preserve override level
        final_level = zone.current_depth_level if zone.is_overridden else median_level
        final_min = zone.current_depth_cm_min if zone.is_overridden else avg_min
        final_max = zone.current_depth_cm_max if zone.is_overridden else avg_max

        # Update zone state in DB
        zone.current_depth_level = final_level
        zone.current_depth_cm_min = final_min
        zone.current_depth_cm_max = final_max
        zone.last_updated_at = now
        await session.commit()

        return ZoneStatus(
            zone_id=zone.id,
            zone_name=zone.name,
            district=zone.district,
            city=zone.city,
            depth_level=final_level,
            depth_cm_min=final_min,
            depth_cm_max=final_max,
            confidence_score=avg_conf,
            is_flooded=final_level >= 2,
            is_overridden=zone.is_overridden,
            cameras_reporting=len(recent_readings),
            active_alerts=[f"Flood Alert: {final_min}-{final_max}cm"] if final_level >= 3 else [],
            last_updated=now,
        )
