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
        # Fast in-memory index: camera_id -> CameraDTO
        self._cameras_by_id: Dict[str, CameraDTO] = {}
        self._cameras_list: List[CameraDTO] = []
        self._background_task: Optional[asyncio.Task] = None
        self._sync_lock = asyncio.Lock()
        self._last_synced_at: Optional[datetime] = None

    def register_provider(self, provider: BaseCameraProvider):
        """Registers a camera provider instance."""
        self._providers[provider.provider_name] = provider
        logger.info(
            "Registered camera provider: '%s' for city: '%s'",
            provider.provider_name,
            provider.city,
        )

    def get_provider(self, provider_name: str) -> Optional[BaseCameraProvider]:
        """Retrieves a provider instance by name."""
        return self._providers.get(provider_name)

    def list_providers(self) -> Dict[str, Any]:
        """Lists all registered providers and their telemetry."""
        result = {}
        for name, p in self._providers.items():
            result[name] = {
                "provider_name": p.provider_name,
                "city": p.city,
                "cameras_indexed": sum(1 for c in self._cameras_list if c.provider == name),
            }
        return result

    # =========================================================================
    # Synchronization & Ingestion
    # =========================================================================

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

                # Update in-memory index
                for cam in cameras:
                    self._cameras_by_id[cam.id] = cam

                # Rebuild full sorted list
                self._cameras_list = list(self._cameras_by_id.values())
                self._last_synced_at = datetime.now(timezone.utc)

                # Persist catalog to cache
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
                    provider_name,
                    len(cameras),
                    active_count,
                    duration,
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
        for provider_name, provider in self._providers.items():
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
            # Sync in background task so server startup is instantaneous
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

    # =========================================================================
    # Query & Retrieval
    # =========================================================================

    def _matches_filter(self, cam: CameraDTO, q: CameraFilterQuery) -> bool:
        """Evaluates whether a camera matches query filters."""
        if q.city and cam.city.lower() != q.city.lower():
            return False

        if q.status and q.status.upper() != "ALL":
            if cam.status.upper() != q.status.upper():
                return False

        if q.district:
            q_dist = q.district.lower().strip()
            cam_dist = (cam.district or "").lower()
            if q_dist not in cam_dist:
                return False

        if q.keyword:
            kw = q.keyword.lower().strip()
            target_text = f"{cam.name} {cam.code or ''} {cam.district or ''}".lower()
            if kw not in target_text:
                return False

        if q.bbox:
            # Format: min_lat,min_lng,max_lat,max_lng
            try:
                parts = [float(x.strip()) for x in q.bbox.split(",")]
                if len(parts) == 4 and cam.latitude is not None and cam.longitude is not None:
                    min_lat, min_lng, max_lat, max_lng = parts
                    if not (min_lat <= cam.latitude <= max_lat and min_lng <= cam.longitude <= max_lng):
                        return False
            except (ValueError, IndexError):
                pass

        return True

    async def get_cameras(self, query: CameraFilterQuery) -> CameraListResponse:
        """Searches and paginates camera records."""
        # If catalog is currently empty, ensure HCMC provider runs sync or loads
        if not self._cameras_list and "hcmc" in self._providers:
            await self.sync_provider("hcmc")

        filtered = [c for c in self._cameras_list if self._matches_filter(c, query)]
        total = len(filtered)
        paged_items = filtered[query.offset : query.offset + query.limit]

        return CameraListResponse(
            total=total,
            limit=query.limit,
            offset=query.offset,
            items=paged_items,
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
        cam = self._cameras_by_id.get(camera_id)
        provider_name = cam.provider if cam else "hcmc"
        provider = self.get_provider(provider_name) or self.get_provider("hcmc")

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
