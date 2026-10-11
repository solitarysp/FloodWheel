import json
import logging
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Camera, FloodReadingDB, FloodZone

logger = logging.getLogger(__name__)

COLOR_MAP = {
    0: "#10b981",  # emerald (dry)
    1: "#84cc16",  # lime (puddle)
    2: "#eab308",  # amber (caution)
    3: "#f97316",  # orange (danger)
    4: "#ef4444",  # red (severe)
    5: "#7c3aed",  # purple (catastrophic)
}


class HeatmapBuilder:
    """Builds GeoJSON FeatureCollection representation of city flood zones and camera nodes."""

    @classmethod
    async def build_geojson(cls, session: AsyncSession) -> Dict[str, Any]:
        stmt = select(FloodZone)
        result = await session.execute(stmt)
        zones: List[FloodZone] = list(result.scalars().all())

        features = []
        for zone in zones:
            try:
                geometry = json.loads(zone.geometry_geojson)
            except Exception:
                geometry = {
                    "type": "Point",
                    "coordinates": [zone.center_lng, zone.center_lat],
                }

            level = zone.current_depth_level or 0
            color = COLOR_MAP.get(level, COLOR_MAP[0])

            features.append({
                "type": "Feature",
                "id": zone.id,
                "geometry": geometry,
                "properties": {
                    "type": "zone",
                    "zone_id": zone.id,
                    "name": zone.name,
                    "district": zone.district,
                    "city": zone.city,
                    "depth_level": level,
                    "depth_cm_min": zone.current_depth_cm_min,
                    "depth_cm_max": zone.current_depth_cm_max,
                    "color": color,
                    "is_overridden": zone.is_overridden,
                    "center": [zone.center_lng, zone.center_lat],
                    "last_updated": zone.last_updated_at.isoformat() if zone.last_updated_at else None,
                },
            })

        # Also include camera-level point features with their latest flood reading
        latest_readings_stmt = (
            select(FloodReadingDB, Camera)
            .join(Camera, Camera.id == FloodReadingDB.camera_id)
            .distinct(FloodReadingDB.camera_id)
            .order_by(FloodReadingDB.camera_id, FloodReadingDB.timestamp.desc())
        )
        cr_res = await session.execute(latest_readings_stmt)
        for reading, cam in cr_res.all():
            lvl = reading.depth_level if reading.depth_level is not None else 0
            features.append({
                "type": "Feature",
                "id": f"cam-{cam.id}",
                "geometry": {
                    "type": "Point",
                    "coordinates": [cam.longitude, cam.latitude],
                },
                "properties": {
                    "type": "camera",
                    "camera_id": cam.id,
                    "name": cam.name,
                    "location": cam.location,
                    "depth_level": lvl,
                    "depth_cm_min": reading.depth_estimate_cm_min,
                    "depth_cm_max": reading.depth_estimate_cm_max,
                    "flood_detected": reading.flood_detected,
                    "confidence_score": reading.confidence_score,
                    "color": COLOR_MAP.get(lvl, COLOR_MAP[0]),
                    "alert_message": reading.alert_message,
                    "center": [cam.longitude, cam.latitude],
                    "last_updated": reading.timestamp.isoformat() if reading.timestamp else None,
                },
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }
