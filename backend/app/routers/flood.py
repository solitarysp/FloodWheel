import math
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.db_models import FloodReadingDB, FloodZone
from app.models.zone_status import ZoneStatus
from app.services.heatmap_builder import HeatmapBuilder
from app.services.zone_aggregator import ZoneAggregator

router = APIRouter(prefix="/flood", tags=["Flood"])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/heatmap")
async def get_heatmap(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Returns GeoJSON FeatureCollection of all monitored flood zones for Mapbox layer rendering."""
    return await HeatmapBuilder.build_geojson(db)


@router.get("/zones", response_model=List[ZoneStatus])
async def list_zones(db: AsyncSession = Depends(get_db)):
    """List current flood statuses for all monitored city zones."""
    stmt = select(FloodZone)
    result = await db.execute(stmt)
    zones = list(result.scalars().all())

    status_list = []
    for z in zones:
        status_list.append(
            ZoneStatus(
                zone_id=z.id,
                zone_name=z.name,
                district=z.district,
                city=z.city,
                depth_level=z.current_depth_level or 0,
                depth_cm_min=z.current_depth_cm_min or 0,
                depth_cm_max=z.current_depth_cm_max or 0,
                confidence_score=0.9,
                is_flooded=(z.current_depth_level or 0) >= 2,
                is_overridden=z.is_overridden,
                last_updated=z.last_updated_at,
            )
        )
    return status_list


@router.get("/zone/{zone_id}")
async def get_zone_detail(zone_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve detailed zone status and historical flood readings for the last 24 hours."""
    zone = await db.get(FloodZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    # Fetch recent readings
    stmt = (
        select(FloodReadingDB)
        .where(FloodReadingDB.zone_id == zone_id)
        .order_by(desc(FloodReadingDB.timestamp))
        .limit(20)
    )
    res = await db.execute(stmt)
    readings = list(res.scalars().all())

    return {
        "zone": {
            "id": zone.id,
            "name": zone.name,
            "district": zone.district,
            "city": zone.city,
            "current_depth_level": zone.current_depth_level,
            "current_depth_cm_min": zone.current_depth_cm_min,
            "current_depth_cm_max": zone.current_depth_cm_max,
            "is_overridden": zone.is_overridden,
            "center": [zone.center_lng, zone.center_lat],
            "last_updated": zone.last_updated_at.isoformat() if zone.last_updated_at else None,
        },
        "history": [
            {
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "depth_level": r.depth_level,
                "depth_cm_min": r.depth_estimate_cm_min,
                "depth_cm_max": r.depth_estimate_cm_max,
                "confidence_score": r.confidence_score,
                "alert_message": r.alert_message,
            }
            for r in readings
        ],
    }


@router.get("/status")
async def get_nearest_flood_status(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(5.0, ge=0.1, le=50.0),
    db: AsyncSession = Depends(get_db),
):
    """Finds the nearest flood zones within radius_km of a user's GPS coordinate."""
    stmt = select(FloodZone)
    result = await db.execute(stmt)
    zones = list(result.scalars().all())

    nearby = []
    for z in zones:
        dist = haversine_distance(lat, lng, z.center_lat, z.center_lng)
        if dist <= radius_km:
            nearby.append({
                "zone_id": z.id,
                "name": z.name,
                "distance_km": round(dist, 2),
                "depth_level": z.current_depth_level,
                "depth_cm_min": z.current_depth_cm_min,
                "depth_cm_max": z.current_depth_cm_max,
                "is_flooded": (z.current_depth_level or 0) >= 2,
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return {
        "query_location": {"lat": lat, "lng": lng},
        "nearby_zones": nearby,
    }
