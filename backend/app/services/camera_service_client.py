"""Camera Service Client Adapter.

Connects FloodWheel's core backend to the dedicated camera-backend microservice (:8001),
with automatic fallback to local camera registry and synthetic CCTV frames.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
try:
    import httpx
except ImportError:
    httpx = None

from app.config import settings
from app.models.camera import CameraResponse
from app.services.camera_stream_service import CameraStreamService

logger = logging.getLogger("floodwheel.camera_service_client")


class CameraServiceClient:
    """HTTP client adapter consuming the camera-backend microservice."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.CAMERA_BACKEND_URL).rstrip("/")
        self._client: Optional[Any] = None

    def _get_client(self):
        if self._client is None or getattr(self._client, "is_closed", False):
            if httpx:
                self._client = httpx.AsyncClient(
                    base_url=self.base_url,
                    timeout=httpx.Timeout(8.0, connect=3.0),
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
        limit: int = 100,
        offset: int = 0,
    ) -> Optional[List[Dict[str, Any]]]:
        """Queries camera-backend for list of cameras."""
        client = self._get_client()
        if not client:
            return None

        params = {
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

    async def get_snapshot_bytes(
        self,
        camera_id: str,
        camera_name: str = "",
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> Tuple[bytes, str]:
        """Fetches JPEG snapshot bytes from camera-backend or generates fallback frame."""
        client = self._get_client()
        if client:
            params = {}
            if width:
                params["w"] = width
            if height:
                params["h"] = height

            try:
                resp = await client.get(f"/api/v1/cameras/{camera_id}/snapshot", params=params)
                if resp.status_code == 200 and len(resp.content) > 100:
                    return resp.content, resp.headers.get("content-type", "image/jpeg")
            except Exception as exc:
                logger.warning("Failed to pull snapshot from camera-backend for %s: %s", camera_id, exc)

        # Fallback to local high-contrast synthetic frame
        return CameraStreamService.generate_mock_frame(camera_id, camera_name), "image/jpeg"
