import json
import logging
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import FloodZone

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
    """Builds GeoJSON FeatureCollection representation of city flood zones."""

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

        return {
            "type": "FeatureCollection",
            "features": features,
        }
