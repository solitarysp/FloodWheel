"""Camera Service Client Adapter.

Connects FloodWheel's core backend to the dedicated camera-backend microservice (:8001)
strictly via HTTP APIs, with automated TTL caching and graceful fallback handling.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Set, Tuple
try:
    import httpx
except ImportError:
    httpx = None

from app.config import settings

logger = logging.getLogger("floodwheel.camera_service_client")


class CameraServiceClient:
    """HTTP client adapter consuming the camera-backend microservice."""

    _valid_ids_cache: Optional[Tuple[Set[str], float]] = None
    CACHE_TTL_SECONDS: float = 30.0

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.CAMERA_BACKEND_URL).rstrip("/")
        self._client: Optional[Any] = None

    def _get_client(self):
        if self._client is None or getattr(self._client, "is_closed", False):
            if httpx:
                self._client = httpx.AsyncClient(
                    base_url=self.base_url,
                    timeout=httpx.Timeout(3.5, connect=2.0),
                )
        return self._client

    async def close(self):
        """Closes the async HTTP client."""
        if self._client and not getattr(self._client, "is_closed", False):
            await self._client.aclose()

    async def list_cameras(
        self,
        city: str = "hcmc",
        district: Optional[str] = None,
        keyword: Optional[str] = None,
        status: Optional[str] = None,
        has_snapshot: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Optional[List[Dict[str, Any]]]:
        """Queries camera-backend for list of cameras."""
        client = self._get_client()
        if not client:
            return None

        params: Dict[str, Any] = {
            "city": city,
            "limit": limit,
            "offset": offset,
        }
        if district:
            params["district"] = district
        if keyword:
            params["keyword"] = keyword
        if status:
            params["status"] = status
        if has_snapshot is not None:
            params["has_snapshot"] = "true" if has_snapshot else "false"

        try:
            resp = await client.get("/api/v1/cameras", params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("items", [])
        except Exception as exc:
            logger.warning("Camera service unavailable at %s (%s). Using local registry fallback.", self.base_url, exc)
        return None

    async def get_camera_by_id(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Queries camera-backend for a single camera by ID."""
        client = self._get_client()
        if not client:
            return None

        try:
            resp = await client.get(f"/api/v1/cameras/{camera_id}")
            if resp.status_code == 200:
                return resp.json()
        except Exception as exc:
            logger.warning("Failed to fetch camera %s from camera-backend: %s", camera_id, exc)
        return None

    async def get_valid_snapshot_ids(self, force_refresh: bool = False) -> Set[str]:
        """Fetches set of all camera IDs with verified snapshots via camera-backend API."""
        now = time.time()
        if not force_refresh and self._valid_ids_cache is not None:
            cached_ids, cached_time = self._valid_ids_cache
            if now - cached_time < self.CACHE_TTL_SECONDS:
                return cached_ids

        client = self._get_client()
        if client:
            try:
                # 1. Preferred dedicated endpoint: GET /api/v1/cameras/snapshots/valid-ids
                resp = await client.get("/api/v1/cameras/snapshots/valid-ids")
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        valid_ids = {str(cid).strip() for cid in data if str(cid).strip()}
                        self._valid_ids_cache = (valid_ids, now)
                        logger.info("Retrieved %d valid snapshot camera IDs from camera-backend API.", len(valid_ids))
                        return valid_ids
            except Exception as exc:
                logger.debug("Failed querying /snapshots/valid-ids: %s. Trying list_cameras fallback.", exc)

            # 2. Fallback: GET /api/v1/cameras?has_snapshot=true
            try:
                items = await self.list_cameras(has_snapshot=True, limit=1000)
                if items:
                    valid_ids = {str(item.get("id")).strip() for item in items if item.get("id")}
                    self._valid_ids_cache = (valid_ids, now)
                    return valid_ids
            except Exception as exc:
                logger.warning("Failed discovering valid snapshot IDs via API: %s", exc)

        if self._valid_ids_cache is not None:
            return self._valid_ids_cache[0]
        return set()

    async def has_valid_snapshot(self, camera_id: str) -> bool:
        """Checks if a camera possesses an authentic snapshot according to camera-backend."""
        if not camera_id:
            return False
        valid_ids = await self.get_valid_snapshot_ids()
        return camera_id in valid_ids

    async def get_snapshot_bytes(
        self,
        camera_id: str,
        camera_name: str = "",
        width: Optional[int] = None,
        height: Optional[int] = None,
        force_refresh: bool = False,
        storage_only: bool = False,
    ) -> Tuple[Optional[bytes], str]:
        """Fetches JPEG snapshot bytes from camera-backend API.
        
        When storage_only=True, only stored frames are returned without upstream live scraping.
        When storage_only=False, falls back to synthetic mock frame if camera-backend is unreachable.
        """
        client = self._get_client()
        if client:
            params: Dict[str, Any] = {}
            if width:
                params["w"] = width
            if height:
                params["h"] = height
            if force_refresh:
                params["force_refresh"] = "true"
            if storage_only:
                params["storage_only"] = "true"

            try:
                resp = await client.get(f"/api/v1/cameras/{camera_id}/snapshot", params=params)
                if resp.status_code == 200 and len(resp.content) > 100:
                    from app.services.image_validator import ImageValidator
                    if ImageValidator.is_valid_real_snapshot(resp.content):
                        return resp.content, resp.headers.get("content-type", "image/jpeg")
            except Exception as exc:
                logger.warning("Failed to pull snapshot from camera-backend for %s: %s", camera_id, exc)

        if storage_only:
            return None, ""

        from app.services.camera_stream_service import CameraStreamService
        return CameraStreamService.generate_mock_frame(camera_id, camera_name), "image/jpeg"


# Export singleton client instance
camera_service_client = CameraServiceClient()
