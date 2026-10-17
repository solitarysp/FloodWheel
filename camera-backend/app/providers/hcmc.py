"""Ho Chi Minh City Municipal Traffic Camera Provider.

Connects to Cổng thông tin giao thông TP. Hồ Chí Minh
(https://giaothong.hochiminhcity.gov.vn) to scrape public CCTV feeds,
maintain authenticated session cookies (.VDMS), and proxy real-time snapshot images.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from app.core.config import settings
from app.models.camera import CameraDTO
from app.providers.base import BaseCameraProvider
from app.providers.hcmc_catalog import HCMCCatalogParser
from app.providers.hcmc_mock import HCMCMockFrameGenerator
from app.providers.hcmc_parser import HCMCParser
from app.providers.hcmc_session import HCMCSessionManager
from app.providers.hcmc_snapshot import HCMCSnapshotHandler

logger = logging.getLogger("camera_service.hcmc_provider")

HCMC_CATALOG_PAYLOAD = {
    "path": "/root/vdms/tangthu/data/layerdata/camera",
    "isInTree": False,
    "searchKey": "",
    "layer": ["CAMERA"],
    "detail": True,
    "page": 0,
    "limit": -1,
    "filterQuery": ["Publish:true"],
    "sortby": None,
    "returnFields": [
        "CamId", "Code", "Location", "SnapshotUrl", "CamType",
        "Disctrict", "Publish", "ManagementUnit", "CamStatus",
        "PTZ", "Angle", "DisplayName", "VideoUrl", "VideoStreaming"
    ],
}


class HCMCCameraProvider(BaseCameraProvider):
    """Provider implementation for Ho Chi Minh City traffic cameras."""

    provider_name: str = "hcmc"
    city: str = "hcmc"

    def __init__(self, cache_service: Optional[Any] = None, storage_service: Optional[Any] = None):
        self.cache_service = cache_service
        self.storage_service = storage_service
        self._cached_cameras: Optional[List[CameraDTO]] = None
        self._last_synced_at: Optional[datetime] = None

        if httpx is not None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS, connect=5.0),
                headers={
                    "User-Agent": settings.HCMC_USER_AGENT,
                    "Referer": settings.HCMC_MAP_URL,
                    "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
                },
                follow_redirects=True,
            )
        else:
            self._client = None

        self.session_manager = HCMCSessionManager(
            client=self._client,
            cache_service=self.cache_service,
            retry_interval_seconds=settings.COOKIE_RETRY_INTERVAL_SECONDS,
            on_recovered_callback=self._on_cookie_recovered,
        )
        self._snapshot_handler = HCMCSnapshotHandler(self._client, self.storage_service)

    @property
    def _cookies(self) -> Dict[str, str]:
        """Provides backward-compatible access to current session cookies."""
        return self.session_manager.cookies

    @_cookies.setter
    def _cookies(self, val: Dict[str, str]):
        self.session_manager.cookies = val

    @property
    def _auth_lock(self) -> asyncio.Lock:
        """Backward-compatible access to the session auth lock."""
        return self.session_manager._auth_lock

    # Expose parser & mock helper methods on the class for backward compatibility
    _clean_ajaxpro_response = staticmethod(HCMCParser.clean_ajaxpro_response)
    _parse_coordinates = staticmethod(HCMCParser.parse_coordinates)
    generate_mock_frame = classmethod(lambda cls, cam_id, name="": HCMCMockFrameGenerator.generate_mock_frame(cam_id, name))

    async def _on_cookie_recovered(self):
        """Self-healing hook triggered when cookie acquisition recovers after retries."""
        logger.info("HCMC cookie recovered. Checking if catalog needs initial or refresh sync...")
        if not self._cached_cameras:
            try:
                await self.get_cameras(force_refresh=True)
            except Exception as exc:
                logger.warning("Failed to refresh catalog after cookie recovery: %s", exc)

    async def close(self):
        """Closes the underlying session manager and HTTP client."""
        await self.session_manager.close()
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    async def init_session(self, force: bool = False) -> Dict[str, str]:
        """Fetches or refreshes session authentication cookies from map.aspx with 5-min retry on failure."""
        return await self.session_manager.ensure_session(force=force)

    async def get_cameras(self, force_refresh: bool = False) -> List[CameraDTO]:
        """Queries the AjaxPro FolderAjax endpoint to retrieve all ~800 public traffic cameras."""
        if self._cached_cameras is not None and not force_refresh:
            return self._cached_cameras

        if not self.session_manager.is_cookie_valid(self._cookies):
            await self.init_session()

        headers = {"Content-Type": "text/plain; charset=UTF-8", "X-AjaxPro-Method": "SearchQuery"}

        for attempt in range(2):
            try:
                logger.info("Querying HCMC AjaxPro SearchQuery (attempt %d/2)...", attempt + 1)
                resp = await self._client.post(
                    settings.HCMC_AJAX_FOLDER_URL,
                    content=json.dumps(HCMC_CATALOG_PAYLOAD),
                    headers=headers,
                    cookies=self._cookies,
                    timeout=30.0,
                )
                resp.raise_for_status()

                if "User is not authenticated" in resp.text or resp.status_code in (401, 403):
                    logger.warning("HCMC session expired. Re-authenticating...")
                    await self.init_session(force=True)
                    continue

                cameras = HCMCCatalogParser.parse_cameras_response(resp.text, self.provider_name, self.city)
                self._cached_cameras = cameras
                self._last_synced_at = datetime.now(timezone.utc)
                logger.info("Successfully extracted %d HCMC cameras!", len(cameras))
                return cameras
            except Exception as exc:
                logger.error("HCMC camera extraction error (attempt %d): %s", attempt + 1, exc)
                if attempt == 0:
                    await self.init_session(force=True)
                else:
                    if self._cached_cameras:
                        logger.warning("Returning stale cached cameras (%d count)", len(self._cached_cameras))
                        return self._cached_cameras
                    raise

        return self._cached_cameras or []

    async def get_snapshot(
        self,
        camera_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> Tuple[bytes, str]:
        """Fetches the real-time JPEG snapshot from port 8007 CameraHandler.ashx."""
        if not self.session_manager.is_cookie_valid(self._cookies):
            await self.init_session()

        return await self._snapshot_handler.get_snapshot(
            camera_id=camera_id,
            cookies=self._cookies,
            reauth_callback=self.init_session,
            width=width,
            height=height,
        )

    async def health_check(self) -> Dict[str, Any]:
        """Verifies connectivity to municipal endpoints and cookie session telemetry."""
        session_telemetry = self.session_manager.get_telemetry()
        has_cookies = session_telemetry["has_valid_cookie"]
        return {
            "provider": self.provider_name,
            "city": self.city,
            "status": "active" if has_cookies or self._cached_cameras else "ready",
            "session_active": has_cookies,
            "cached_cameras_count": len(self._cached_cameras) if self._cached_cameras else 0,
            "last_synced_at": self._last_synced_at.isoformat() if self._last_synced_at else None,
            "session": session_telemetry,
        }
