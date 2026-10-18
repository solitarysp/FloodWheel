"""Snapshot extraction, fallback, and validation pipeline for HCMC camera feeds."""

import asyncio
import logging
from typing import Any, Dict, Optional, Tuple

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from app.core.config import settings
from app.providers.hcmc_mock import HCMCMockFrameGenerator
from app.services.image_validator import ImageValidator

logger = logging.getLogger("camera_service.hcmc_snapshot")


class HCMCSnapshotHandler:
    """Manages snapshot fetching, validation, and multi-tier fallbacks."""

    def __init__(
        self,
        client: httpx.AsyncClient,
        storage_service: Optional[Any] = None,
    ):
        self._client = client
        self.storage_service = storage_service

    async def get_snapshot(
        self,
        camera_id: str,
        cookies: Dict[str, str],
        reauth_callback: Any,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> Tuple[bytes, str]:
        """Fetches the real-time JPEG snapshot from CameraHandler.ashx.

        If upstream fails or returns an error banner ('IMAGE NOT AVAILABLE'),
        retries up to configured N times if matching KNOWN_ERROR_MD5/SHA256,
        then falls back to disk storage or synthetic frame.
        """
        url = f"{settings.HCMC_CAMERA_HANDLER_URL}?id={camera_id}&bg=black"
        if width and height:
            url += f"&w={width}&h={height}"

        current_cookies = cookies
        max_error_retries = max(0, getattr(settings, "SNAPSHOT_ERROR_RETRY_COUNT", 3))
        error_retries_done = 0
        auth_retries_done = 0

        while True:
            try:
                resp = await self._client.get(
                    url,
                    cookies=current_cookies,
                    timeout=min(settings.HTTP_TIMEOUT_SECONDS, 4.0),
                )

                if resp.status_code in (401, 403) or len(resp.content) < 50:
                    if auth_retries_done < 1:
                        auth_retries_done += 1
                        logger.warning("Snapshot 403/Forbidden for %s. Re-authenticating...", camera_id)
                        current_cookies = await reauth_callback(force=True)
                        continue
                    break

                resp.raise_for_status()

                # Check if payload matches known municipal error banner / synthetic frame hash
                if ImageValidator.matches_known_error_hash(resp.content):
                    if error_retries_done < max_error_retries:
                        error_retries_done += 1
                        logger.warning(
                            "Camera %s returned known error placeholder hash. Retrying (%d/%d)...",
                            camera_id,
                            error_retries_done,
                            max_error_retries,
                        )
                        delay = getattr(settings, "SNAPSHOT_ERROR_RETRY_DELAY_SECONDS", 0.0)
                        if delay > 0:
                            await asyncio.sleep(delay)
                        continue

                    logger.warning(
                        "Camera %s returned known error placeholder hash. Retries exhausted (%d/%d). Rejecting payload.",
                        camera_id,
                        error_retries_done,
                        max_error_retries,
                    )
                    break

                # Validate payload: detect other corrupted headers or placeholder banners
                if not ImageValidator.is_valid_snapshot(resp.content):
                    logger.warning(
                        "Upstream camera %s returned invalid or error placeholder image (%d bytes). Rejecting payload.",
                        camera_id,
                        len(resp.content),
                    )
                    break

                # Valid live frame from municipal server
                return resp.content, "live"

            except Exception as exc:
                logger.warning("Snapshot fetch attempt failed for %s: %s", camera_id, exc)
                # Fast fallback: if we have a valid snapshot on disk, return it immediately
                disk_frame = await self._get_stored_frame(camera_id)
                if disk_frame is not None:
                    return disk_frame, "disk-storage"

                if auth_retries_done < 1:
                    auth_retries_done += 1
                    current_cookies = await reauth_callback(force=True)
                else:
                    break

        # Fallback Strategy Tier 1: Check persistent disk storage
        disk_frame = await self._get_stored_frame(camera_id)
        if disk_frame is not None:
            return disk_frame, "disk-storage"

        # Tier 2: Generate synthetic CCTV frame with timestamp and location overlay
        logger.info("No prior valid snapshot on disk. Generating synthetic fallback frame for %s", camera_id)
        return HCMCMockFrameGenerator.generate_mock_frame(camera_id), "synthetic"

    async def _get_stored_frame(self, camera_id: str) -> Optional[bytes]:
        """Retrieves and validates snapshot from persistent disk storage."""
        if not self.storage_service:
            return None
        stored_frame = await self.storage_service.get_snapshot(camera_id)
        if stored_frame and ImageValidator.is_valid_snapshot(stored_frame):
            logger.info(
                "Serving last-known-good disk fallback frame for camera %s (%d bytes)",
                camera_id,
                len(stored_frame),
            )
            return stored_frame
        return None
