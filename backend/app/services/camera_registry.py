from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.camera import CameraCreate, CameraUpdate
from app.models.db_models import Camera, FloodZone


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
        # Validate zone_id if specified
        if camera_in.zone_id:
            zone = await session.get(FloodZone, camera_in.zone_id)
            if not zone:
                raise HTTPException(
                    status_code=400,
                    detail=f"Flood zone '{camera_in.zone_id}' does not exist. Choose an existing zone or leave unassigned.",
                )

        cam = Camera(
            id=camera_in.id,
            name=camera_in.name,
            location=camera_in.location,
            latitude=camera_in.latitude,
            longitude=camera_in.longitude,
            camera_angle=camera_in.camera_angle,
            stream_url=camera_in.stream_url,
            video_url=camera_in.video_url,
            zone_id=camera_in.zone_id,
            status="ONLINE",
            failed_polls_count=0,
            last_polled_at=datetime.now(timezone.utc),
        )

        try:
            session.add(cam)
            await session.commit()
            await session.refresh(cam)
            return cam
        except HTTPException:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to register camera: {str(exc)}",
            )

    @staticmethod
    def _slugify(text: str) -> str:
        import re
        import unicodedata
        nfkd = unicodedata.normalize("NFKD", text)
        ascii_text = "".join([c for c in nfkd if not unicodedata.combining(c)])
        clean = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.strip().lower()).strip("-")
        return clean or "hcmc"

    @classmethod
    async def ensure_camera_and_zone(
        cls,
        session: AsyncSession,
        camera_id: str,
        name: str,
        location: str,
        latitude: float,
        longitude: float,
        stream_url: Optional[str] = None,
        camera_angle: str = "elevated",
        status: str = "ONLINE",
    ) -> Camera:
        import json

        district_name = location or "TP. Hồ Chí Minh"
        zone_slug = f"zone-{cls._slugify(district_name)}"

        # 1. Ensure FloodZone exists
        zone = await session.get(FloodZone, zone_slug)
        if not zone:
            zone = FloodZone(
                id=zone_slug,
                name=f"Khu vực {district_name}",
                district=district_name,
                city="hcmc",
                center_lat=latitude or 10.7769,
                center_lng=longitude or 106.7009,
                geometry_geojson=json.dumps({
                    "type": "Point",
                    "coordinates": [longitude or 106.7009, latitude or 10.7769],
                }),
                current_depth_level=0,
                current_depth_cm_min=0,
                current_depth_cm_max=0,
                is_overridden=False,
                last_updated_at=datetime.now(timezone.utc),
            )
            session.add(zone)
            await session.flush()

        # 2. Ensure Camera exists
        cam = await session.get(Camera, camera_id)
        if not cam:
            cam = Camera(
                id=camera_id,
                name=name or camera_id,
                location=location or district_name,
                latitude=latitude or 10.7769,
                longitude=longitude or 106.7009,
                camera_angle=camera_angle or "elevated",
                stream_url=stream_url or f"/cameras/{camera_id}/snapshot",
                zone_id=zone_slug,
                status=status or "ONLINE",
                failed_polls_count=0,
                last_polled_at=datetime.now(timezone.utc),
            )
            session.add(cam)
            await session.flush()
        else:
            if not cam.zone_id:
                cam.zone_id = zone_slug
            if status:
                cam.status = status
            await session.flush()

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
