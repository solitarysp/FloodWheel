from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.camera import CameraCreate, CameraUpdate
from app.models.db_models import Camera


class CameraRegistry:
    """Service for managing camera devices and health state."""

    @staticmethod
    async def get_all(session: AsyncSession, zone_id: Optional[str] = None) -> List[Camera]:
        stmt = select(Camera)
        if zone_id:
            stmt = stmt.where(Camera.zone_id == zone_id)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(session: AsyncSession, camera_id: str) -> Optional[Camera]:
        return await session.get(Camera, camera_id)

    @staticmethod
    async def create(session: AsyncSession, camera_in: CameraCreate) -> Camera:
        cam = Camera(
            id=camera_in.id,
            name=camera_in.name,
            location=camera_in.location,
            latitude=camera_in.latitude,
            longitude=camera_in.longitude,
            camera_angle=camera_in.camera_angle,
            stream_url=camera_in.stream_url,
            zone_id=camera_in.zone_id,
            status="ONLINE",
            failed_polls_count=0,
            last_polled_at=datetime.now(timezone.utc),
        )
        session.add(cam)
        await session.commit()
        await session.refresh(cam)
        return cam

    @staticmethod
    async def record_poll_result(session: AsyncSession, camera_id: str, success: bool) -> Optional[Camera]:
        cam = await session.get(Camera, camera_id)
        if not cam:
            return None

        cam.last_polled_at = datetime.now(timezone.utc)
        if success:
            cam.failed_polls_count = 0
            if cam.status == "OFFLINE":
                cam.status = "ONLINE"
        else:
            cam.failed_polls_count += 1
            # Mark OFFLINE after 5 consecutive failed polls
            if cam.failed_polls_count >= 5:
                cam.status = "OFFLINE"

        await session.commit()
        await session.refresh(cam)
        return cam
