"""Flood Monitoring and Queue API Router Composer.

Aggregates:
- zones router (heatmap, zones, status, summary)
- queue router (status, enqueue, trigger, pause, resume, history, analyze-batch)
"""

from fastapi import APIRouter
from app.routers.flood.queue import router as queue_router
from app.routers.flood.zones import router as zones_router
from app.utils.geo import haversine_distance

router = APIRouter(prefix="/flood", tags=["Flood"])

# Include sub-routers into the composite flood router
router.include_router(queue_router)
router.include_router(zones_router)

__all__ = ["router", "haversine_distance"]
