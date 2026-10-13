"""Camera snapshot fetch orchestrator across providers, disk storage, and cache."""

import logging
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings
from app.models.camera import CameraDTO
from app.providers.base import BaseCameraProvider
from app.services.cache_service import CacheService

logger = logging.getLogger("camera_service.catalog_snapshot")


class CatalogSnapshotService:
    """Handles snapshot retrieval lifecycle including Redis cache, provider delegation, and disk persistence."""

    def __init__(
        self,
        cache_service: CacheService,
        storage_service: Optional[Any] = None,
    ):
        self.cache_service = cache_service
        self.storage_service = storage_service

    async def get_snapshot(
        self,
        camera_id: str,
        cameras_by_id: Dict[str, CameraDTO],
        providers: Dict[str, BaseCameraProvider],
        width: Optional[int] = None,
        height: Optional[int] = None,
        force_refresh: bool = False,
    ) -> Tuple[bytes, str, bool, str]:
        """Retrieves camera snapshot frame.

        Returns: (image_bytes, content_type, is_cached_hit, fallback_source)
        """
        # 1. Check cache first unless forced
        if not force_refresh:
            cached_bytes = await self.cache_service.get_snapshot(camera_id)
            if cached_bytes:
                return cached_bytes, "image/jpeg", True, "redis"

        # 2. Determine owning provider
        cam = cameras_by_id.get(camera_id)
        provider_name = cam.provider if cam else "hcmc"
        provider = providers.get(provider_name) or providers.get("hcmc")

        if not provider:
            raise RuntimeError("No camera provider available.")

        # 3. Pull frame from provider
        result = await provider.get_snapshot(camera_id, width=width, height=height)
        if isinstance(result, tuple) and len(result) == 2:
            frame_bytes, source = result
        else:
            frame_bytes, source = result, "live"

        # 4. If live frame was retrieved, persist to disk immediately
        if source == "live" and self.storage_service and frame_bytes:
            await self.storage_service.save_snapshot(camera_id, frame_bytes)

        # 5. Store in cache
        if frame_bytes and len(frame_bytes) > 100:
            ttl = (
                settings.SNAPSHOT_CACHE_TTL_SECONDS
                if source == "live"
                else 5.0
            )
            await self.cache_service.set_snapshot(
                camera_id,
                frame_bytes,
                ttl=ttl,
            )

        return frame_bytes, "image/jpeg", False, source
