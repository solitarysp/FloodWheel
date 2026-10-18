"""Camera Catalog Aggregator and Synchronization Engine.

Coordinates multiple camera providers, indexes camera metadata,
applies search and geographic filters, and schedules background catalog syncs.
"""

import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.camera import (
    CameraDTO,
    CameraFilterQuery,
    CameraListResponse,
    ProviderSyncResult,
)
from app.providers.base import BaseCameraProvider
from app.services.cache_service import CacheService
from app.services.catalog_matcher import CameraFilterMatcher
from app.services.catalog_snapshot import CatalogSnapshotService

logger = logging.getLogger("camera_service.catalog")


class CatalogService:
    """Manages multi-provider camera registry and catalog queries."""

    def __init__(
        self,
        cache_service: CacheService,
        storage_service: Optional[Any] = None,
    ):
        self.cache_service = cache_service
        self.storage_service = storage_service
        self._providers: Dict[str, BaseCameraProvider] = {}
        self._cameras_by_id: Dict[str, CameraDTO] = {}
        self._cameras_list: List[CameraDTO] = []
        self._background_task: Optional[asyncio.Task] = None
        self._sync_lock = asyncio.Lock()
        self._last_synced_at: Optional[datetime] = None
        self._snapshot_handler = CatalogSnapshotService(cache_service, storage_service)

    def register_provider(self, provider: BaseCameraProvider):
        """Registers a camera provider instance."""
        self._providers[provider.provider_name] = provider
        logger.info("Registered camera provider: '%s' for city: '%s'", provider.provider_name, provider.city)

    def get_provider(self, provider_name: str) -> Optional[BaseCameraProvider]:
        """Retrieves a provider instance by name."""
        return self._providers.get(provider_name)

    def list_providers(self) -> Dict[str, Any]:
        """Lists all registered providers and their telemetry."""
        return {
            name: {
                "provider_name": p.provider_name,
                "city": p.city,
                "cameras_indexed": sum(1 for c in self._cameras_list if c.provider == name),
            }
            for name, p in self._providers.items()
        }

    async def sync_provider(self, provider_name: str = "hcmc") -> ProviderSyncResult:
        """Triggers catalog synchronization for a specific provider."""
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown camera provider: '{provider_name}'")

        start_time = time.time()
        async with self._sync_lock:
            logger.info("Starting catalog synchronization for provider: %s", provider_name)
            try:
                cameras = await provider.get_cameras(force_refresh=True)
                for cam in cameras:
                    self._cameras_by_id[cam.id] = cam

                self._cameras_list = list(self._cameras_by_id.values())
                self._last_synced_at = datetime.now(timezone.utc)

                serialized = [c.model_dump(mode="json") for c in cameras]
                await self.cache_service.set_catalog(
                    city=provider.city,
                    items=serialized,
                    ttl=settings.CATALOG_SYNC_INTERVAL_SECONDS,
                )

                duration = time.time() - start_time
                active_count = sum(1 for c in cameras if c.status == "UP")
                logger.info(
                    "Catalog sync completed for %s: %d cameras indexed (%d UP) in %.2fs",
                    provider_name, len(cameras), active_count, duration,
                )

                return ProviderSyncResult(
                    provider=provider_name,
                    status="success",
                    total_cameras=len(cameras),
                    active_cameras=active_count,
                    duration_seconds=round(duration, 2),
                    timestamp=self._last_synced_at,
                )
            except Exception as exc:
                duration = time.time() - start_time
                logger.error("Catalog sync failed for %s: %s", provider_name, exc)
                return ProviderSyncResult(
                    provider=provider_name,
                    status=f"error: {str(exc)}",
                    total_cameras=len(self._cameras_list),
                    active_cameras=sum(1 for c in self._cameras_list if c.status == "UP"),
                    duration_seconds=round(duration, 2),
                    timestamp=datetime.now(timezone.utc),
                )

    async def load_initial_catalog(self):
        """Attempts to restore catalog from cache; if missing, triggers sync."""
        restored = False
        for _, provider in self._providers.items():
            cached_data = await self.cache_service.get_catalog(provider.city)
            if cached_data:
                try:
                    cams = [CameraDTO(**item) for item in cached_data]
                    for c in cams:
                        self._cameras_by_id[c.id] = c
                    logger.info("Restored %d %s cameras from cache", len(cams), provider.city)
                    restored = True
                except Exception as exc:
                    logger.warning("Failed to parse cached catalog for %s: %s", provider.city, exc)

        if not restored and "hcmc" in self._providers:
            asyncio.create_task(self.sync_provider("hcmc"))

    def start_background_sync(self, interval_seconds: Optional[int] = None):
        """Starts periodic catalog synchronization worker."""
        interval = interval_seconds or settings.CATALOG_SYNC_INTERVAL_SECONDS

        async def _worker():
            logger.info("Background catalog sync worker started (interval: %ds)", interval)
            while True:
                try:
                    await asyncio.sleep(interval)
                    for provider_name in list(self._providers.keys()):
                        await self.sync_provider(provider_name)
                except asyncio.CancelledError:
                    break
                except Exception as exc:
                    logger.error("Background sync worker error: %s", exc)

        if self._background_task is None or self._background_task.done():
            self._background_task = asyncio.create_task(_worker())

    def stop_background_sync(self):
        """Stops the background worker."""
        if self._background_task and not self._background_task.done():
            self._background_task.cancel()

    _matches_filter = staticmethod(CameraFilterMatcher.matches_filter)

    async def get_valid_snapshot_ids(self) -> List[str]:
        """Returns list of camera IDs that have verified valid snapshots on disk."""
        if not self.storage_service or not self.storage_service.storage_dir.is_dir():
            return []
        from app.services.image_validator import ImageValidator
        valid_ids: List[str] = []
        for p in self.storage_service.storage_dir.glob("*.jpg"):
            try:
                data = p.read_bytes()
                if ImageValidator.is_valid_snapshot(data):
                    valid_ids.append(p.stem)
            except Exception:
                pass
        return valid_ids

    async def get_cameras(self, query: CameraFilterQuery) -> CameraListResponse:
        """Searches and paginates camera records."""
        if not self._cameras_list and "hcmc" in self._providers:
            await self.sync_provider("hcmc")

        valid_snapshot_ids = None
        if query.has_snapshot is True:
            valid_snapshot_ids = set(await self.get_valid_snapshot_ids())

        filtered = [
            c for c in self._cameras_list
            if CameraFilterMatcher.matches_filter(c, query)
            and (valid_snapshot_ids is None or c.id in valid_snapshot_ids)
        ]
        return CameraListResponse(
            total=len(filtered),
            limit=query.limit,
            offset=query.offset,
            items=filtered[query.offset : query.offset + query.limit],
        )

    async def get_camera_by_id(self, camera_id: str) -> Optional[CameraDTO]:
        """Finds a single camera by identifier."""
        return self._cameras_by_id.get(camera_id)

    async def get_snapshot(
        self,
        camera_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        force_refresh: bool = False,
        storage_only: bool = False,
    ) -> Tuple[Optional[bytes], str, bool, str]:
        """Retrieves camera snapshot frame (image_bytes, content_type, is_cached_hit, fallback_source)."""
        return await self._snapshot_handler.get_snapshot(
            camera_id=camera_id,
            cameras_by_id=self._cameras_by_id,
            providers=self._providers,
            width=width,
            height=height,
            force_refresh=force_refresh,
            storage_only=storage_only,
        )
