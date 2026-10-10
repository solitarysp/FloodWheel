import math
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import FloodZone
from app.routers.flood import haversine_distance


class RouteScorer:
    """Evaluates planned navigation routes against live flood zones and scores safety."""

    @classmethod
    async def evaluate_route(
        cls,
        session: AsyncSession,
        waypoints: List[List[float]],  # list of [lat, lng]
        vehicle_type: str = "motorcycle",  # "motorcycle" or "car"
    ) -> Dict[str, Any]:
        stmt = select(FloodZone)
        result = await session.execute(stmt)
        zones: List[FloodZone] = list(result.scalars().all())

        flooded_segments = []
        max_depth_cm = 0
        worst_level = 0

        # Check proximity of each waypoint to known flood zones (threshold: 300 meters = 0.3 km)
        for idx, pt in enumerate(waypoints):
            lat, lng = pt[0], pt[1]
            for zone in zones:
                dist_km = haversine_distance(lat, lng, zone.center_lat, zone.center_lng)
                if dist_km <= 0.35 and (zone.current_depth_level or 0) > 0:
                    level = zone.current_depth_level or 0
                    if level > worst_level:
                        worst_level = level
                    if (zone.current_depth_cm_max or 0) > max_depth_cm:
                        max_depth_cm = zone.current_depth_cm_max or 0

                    flooded_segments.append({
                        "waypoint_index": idx,
                        "zone_id": zone.id,
                        "zone_name": zone.name,
                        "district": zone.district,
                        "depth_level": level,
                        "depth_cm_range": f"{zone.current_depth_cm_min}-{zone.current_depth_cm_max}cm",
                        "distance_meters": int(dist_km * 1000),
                    })

        # Calculate Safety Score (0 - 100)
        # Level 0: 100, Level 1: 85, Level 2: 65, Level 3: 35, Level 4: 10, Level 5: 0
        score_by_level = {0: 100, 1: 85, 2: 65, 3: 30, 4: 10, 5: 0}
        safety_score = score_by_level.get(worst_level, 100)

        is_safe_for_motorcycle = worst_level < 3  # Level 3 touches exhaust pipe
        is_safe_for_car = worst_level < 4         # Level 4 submerges door sills

        is_recommended = is_safe_for_motorcycle if vehicle_type == "motorcycle" else is_safe_for_car

        detour_note = "Lộ trình an toàn, không có điểm ngập sâu."
        if not is_recommended:
            detour_note = (
                f"CẢNH BÁO: Lộ trình đi qua điểm ngập Level {worst_level} (ngập tới {max_depth_cm}cm). "
                f"Khuyến nghị tài xế chuyển hướng vòng qua các tuyến đường cao ráo hơn."
            )

        return {
            "vehicle_type": vehicle_type,
            "safety_score": safety_score,
            "is_recommended": is_recommended,
            "worst_flood_level": worst_level,
            "max_depth_cm": max_depth_cm,
            "detour_advice": detour_note,
            "impacted_segments_count": len(flooded_segments),
            "flooded_segments": flooded_segments,
        }
