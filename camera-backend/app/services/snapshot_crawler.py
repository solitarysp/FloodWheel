"""Periodic Snapshot Crawler Service for Camera Backend.

Periodically crawls snapshot frames from active camera providers (e.g. HCMC portal),
validates images to reject placeholder banners, persists valid frames to disk storage,
and pre-warms the Redis snapshot cache.
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.camera import CameraDTO
from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService
from app.services.image_validator import ImageValidator
from app.services.storage_service import SnapshotStorageService

logger = logging.getLogger("camera_service.snapshot_crawler")


class SnapshotCrawlerService:
    """Manages cyclical, rate-limited snapshot fetching and disk caching."""

    def __init__(
        self,
        catalog_service: CatalogService,
        storage_service: SnapshotStorageService,
        cache_service: CacheService,
        interval_seconds: Optional[int] = None,
        concurrency: Optional[int] = None,
        delay_seconds: Optional[float] = None,
    ):
        self.catalog_service = catalog_service
        self.storage_service = storage_service
        self.cache_service = cache_service
        self.interval_seconds = interval_seconds or settings.SNAPSHOT_CRAWL_INTERVAL_SECONDS
        self.concurrency = concurrency or settings.SNAPSHOT_CRAWL_CONCURRENCY
        self.delay_seconds = delay_seconds if delay_seconds is not None else settings.SNAPSHOT_CRAWL_DELAY_SECONDS

        self._task: Optional[asyncio.Task] = None
        self._is_running = False
        self.status = "IDLE"
        self.last_run_started_at: Optional[datetime] = None
        self.last_run_completed_at: Optional[datetime] = None
        self.stats = {
            "cycle_count": 0,
            "total_crawled": 0,
            "success": 0,
            "skipped": 0,
            "failed": 0,
            "last_duration_sec": 0.0,
        }

    def start(self):
        """Starts the periodic background crawl task if enabled."""
        if not settings.SNAPSHOT_CRAWL_ENABLED:
            logger.info("Snapshot crawler is disabled by configuration.")
            return

        if self._task is None or self._task.done():
            self._is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("Started SnapshotCrawlerService (interval: %ds, concurrency: %d)", self.interval_seconds, self.concurrency)

    def stop(self):
        """Cancels and cleanly stops the background worker task."""
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("SnapshotCrawlerService stopped.")

    async def _run_loop(self):
        """Main periodic scheduling loop."""
        # Initial sleep allows catalog to finish its initial load cleanly
        await asyncio.sleep(5.0)

        while self._is_running:
            try:
                await self.run_crawl_cycle()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Error in snapshot crawler cycle: %s", exc)

            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

    async def run_crawl_cycle(self) -> Dict[str, Any]:
        """Executes one pass crawling snapshots across all catalog cameras."""
        self.status = "RUNNING"
        self.last_run_started_at = datetime.now(timezone.utc)
        cycle_start = asyncio.get_event_loop().time()

        cameras: List[CameraDTO] = list(self.catalog_service._cameras_by_id.values())
        if not cameras:
            logger.info("Snapshot crawler: catalog is empty, attempting initial load...")
            await self.catalog_service.load_initial_catalog()
            cameras = list(self.catalog_service._cameras_by_id.values())

        total = len(cameras)
        success = 0
        skipped = 0
        failed = 0

        logger.info(
            "Starting snapshot crawl queue for %d cameras (delay: %.2fs between shots)...",
            total, self.delay_seconds,
        )

        for idx, cam in enumerate(cameras):
            if not self._is_running:
                logger.info("Snapshot crawler stopped mid-cycle.")
                break

            try:
                provider = self.catalog_service._providers.get(cam.provider) or self.catalog_service._providers.get("hcmc")
                if not provider:
                    skipped += 1
                    continue

                # Fetch live frame from provider
                result = await provider.get_snapshot(cam.id)
                frame_bytes = result[0] if isinstance(result, tuple) else result
                source = result[1] if isinstance(result, tuple) else "live"

                if source == "live" and frame_bytes and ImageValidator.is_valid_snapshot(frame_bytes):
                    # Persist to disk
                    await self.storage_service.save_snapshot(cam.id, frame_bytes)
                    # Pre-warm Redis cache
                    await self.cache_service.set_snapshot(
                        cam.id,
                        frame_bytes,
                        ttl=float(self.interval_seconds * 1.5),
                    )
                    success += 1
                else:
                    skipped += 1
            except Exception as exc:
                logger.debug("Failed crawling snapshot for camera %s: %s", cam.id, exc)
                failed += 1

            # Polite queue pause after processing each camera snapshot
            if self.delay_seconds > 0 and idx < total - 1:
                try:
                    await asyncio.sleep(self.delay_seconds)
                except asyncio.CancelledError:
                    break

        duration = round(asyncio.get_event_loop().time() - cycle_start, 2)
        self.last_run_completed_at = datetime.now(timezone.utc)
        self.status = "IDLE"

        self.stats["cycle_count"] += 1
        self.stats["total_crawled"] = total
        self.stats["success"] = success
        self.stats["skipped"] = skipped
        self.stats["failed"] = failed
        self.stats["last_duration_sec"] = duration

        logger.info(
            "Crawl cycle finished in %.1fs: %d success, %d skipped, %d failed out of %d cameras",
            duration, success, skipped, failed, total,
        )
        return self.get_telemetry()

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns real-time telemetry metrics of the snapshot crawler."""
        return {
            "status": self.status,
            "enabled": settings.SNAPSHOT_CRAWL_ENABLED,
            "interval_seconds": self.interval_seconds,
            "concurrency": self.concurrency,
            "delay_seconds": self.delay_seconds,
            "last_run_started_at": self.last_run_started_at.isoformat() if self.last_run_started_at else None,
            "last_run_completed_at": self.last_run_completed_at.isoformat() if self.last_run_completed_at else None,
            "stats": self.stats,
        }
