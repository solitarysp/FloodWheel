from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.db_models import Camera
from app.services.camera_service_client import CameraServiceClient

logger = logging.getLogger("floodwheel.queue_discovery")


class CameraDiscoverer:
    """Discovers candidate cameras with fair rotation based on least-recently-polled order."""

    def __init__(self, camera_service_client: Optional[CameraServiceClient] = None):
        self.camera_service_client = camera_service_client or CameraServiceClient()

    async def discover_all_cameras(self, max_cameras: int = 15) -> List[Dict[str, Any]]:
        cameras: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        db_cams_map: Dict[str, Dict[str, Any]] = {}

        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Camera).where(Camera.status != "OFFLINE")
                res = await session.execute(stmt)
                db_cams = list(res.scalars().all())
                for cam in db_cams:
                    cid = str(cam.id).strip()
                    if cid:
                        db_cams_map[cid] = {
                            "id": cid,
                            "name": cam.name or cid,
                            "district": cam.location or "TP. Hồ Chí Minh",
                            "latitude": cam.latitude,
                            "longitude": cam.longitude,
                            "camera_angle": cam.camera_angle or "elevated",
                            "last_polled_at": cam.last_polled_at,
                            "status": cam.status,
                        }
        except Exception as exc:
            logger.warning("Could not query cameras from local DB: %s", exc)

        from app.services.camera_snapshot_finder import CameraSnapshotFinder
        valid_snapshot_ids = CameraSnapshotFinder.get_valid_snapshot_camera_ids()

        try:
            remote_cams = await self.camera_service_client.list_cameras(has_snapshot=True, limit=500)
            if remote_cams:
                for c in remote_cams:
                    cid = str(c.get("id", "")).strip()
                    if not cid:
                        continue
                    if valid_snapshot_ids and cid not in valid_snapshot_ids:
                        continue
                    if cid in db_cams_map:
                        if cid not in seen_ids:
                            seen_ids.add(cid)
                            cameras.append(db_cams_map[cid])
                    else:
                        if cid not in seen_ids:
                            seen_ids.add(cid)
                            cameras.append({
                                "id": cid,
                                "name": c.get("name") or cid,
                                "district": c.get("district") or c.get("name") or "TP. Hồ Chí Minh",
                                "latitude": c.get("latitude") or 10.7769,
                                "longitude": c.get("longitude") or 106.7009,
                                "camera_angle": c.get("camera_angle") or "elevated",
                                "last_polled_at": None,
                                "status": "ONLINE",
                            })
        except Exception as exc:
            logger.warning("Could not discover cameras from camera-backend: %s", exc)

        for cid, cam_dict in db_cams_map.items():
            if cid not in seen_ids:
                if valid_snapshot_ids and cid not in valid_snapshot_ids:
                    continue
                seen_ids.add(cid)
                cameras.append(cam_dict)

        def _sort_key(c: Dict[str, Any]):
            ts = c.get("last_polled_at")
            if ts is None:
                return (0, datetime.min.replace(tzinfo=timezone.utc))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return (1, ts)

        cameras.sort(key=_sort_key)
        return cameras[:max_cameras]
