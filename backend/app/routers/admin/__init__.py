"""Admin Operations & Control Composite Router.

Composed of:
- system: auth, admin profile, system overview
- queue: background queue controls, scheduler config, queue history
- cameras: CRUD cameras, single & batch AI analysis triggers
- monitoring: operator zone overrides, alert resolution
- readings: deletion of AI flood readings
"""

from fastapi import APIRouter
from app.routers.admin.cameras import router as cameras_router
from app.routers.admin.monitoring import router as monitoring_router
from app.routers.admin.queue import router as queue_router
from app.routers.admin.readings import router as readings_router
from app.routers.admin.system import router as system_router
from app.routers.admin.test_fake import router as test_fake_router

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

router.include_router(system_router)
router.include_router(queue_router)
router.include_router(cameras_router)
router.include_router(monitoring_router)
router.include_router(readings_router)
router.include_router(test_fake_router)

__all__ = ["router"]
