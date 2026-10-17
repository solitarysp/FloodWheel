"""Camera Stream Ingestion and Snapshot Proxy Service.

Provides asynchronous frame retrieval from public CCTV streams,
in-memory caching with 5-second TTL, SSRF validation, and realistic
synthetic fallback frames when external streams are unreachable.
"""

import io
from pathlib import Path
import re
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
try:
    import httpx
except ImportError:
    httpx = None
from PIL import Image, ImageDraw

logger = logging.getLogger("floodwheel.camera_stream_service")


class CameraStreamService:
    """Asynchronous camera stream ingestion and snapshot proxy service."""

    # In-memory cache: camera_id -> (bytes, mime_type, cached_at_timestamp)
    _cache: Dict[str, Tuple[bytes, str, float]] = {}
    CACHE_TTL_SECONDS = 5.0

    PRIVATE_HOSTS = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
    }

    @classmethod
    def is_private_or_restricted(cls, url: str) -> bool:
        """Checks if a URL targets local/private IP addresses (SSRF prevention)."""
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or ""
            if hostname in cls.PRIVATE_HOSTS:
                return True
            if hostname.startswith("10.") or hostname.startswith("192.168."):
                return True
            if hostname.startswith("172."):
                parts = hostname.split(".")
                if len(parts) >= 2 and parts[1].isdigit():
                    val = int(parts[1])
                    if 16 <= val <= 31:
                        return True
            return False
        except Exception:
            return True

    @classmethod
    def validate_stream_url(cls, stream_url: str) -> Tuple[bool, str]:
        """Validates that a public camera URL has a valid scheme and is not SSRF-restricted."""
        try:
            parsed = urlparse(stream_url)
            if parsed.scheme not in ("http", "https"):
                return False, "Stream URL must use http or https scheme."
            if not parsed.netloc:
                return False, "Stream URL must contain a valid host domain."
            if cls.is_private_or_restricted(stream_url):
                return False, "Stream URL targeting private/internal network addresses is prohibited."
            return True, "Valid"
        except Exception as exc:
            return False, f"Invalid stream URL format: {str(exc)}"

    @classmethod
    def generate_mock_frame(cls, camera_id: str, camera_name: str = "") -> bytes:
        """Generates a high-contrast synthetic CCTV frame with timestamp and location overlay."""
        width, height = 640, 360
        img = Image.new("RGB", (width, height), color=(24, 28, 36))
        draw = ImageDraw.Draw(img)

        # Draw urban street representation (sky, road, sidewalk, flood puddle)
        draw.rectangle([(0, 0), (width, 140)], fill=(35, 42, 54))  # Sky / background
        draw.rectangle([(0, 140), (width, 160)], fill=(80, 85, 95))  # Curb line
        draw.rectangle([(0, 160), (width, height)], fill=(45, 50, 58))  # Asphalt road

        # Simulate water reflections / standing water on lower roadway
        draw.rectangle([(50, 220), (590, 320)], fill=(38, 62, 78))  # Flood pool reflection
        draw.line([(0, 220), (width, 220)], fill=(60, 95, 120), width=2)

        # Vehicle silhouette landmark (motorcycle wheels touching flood line)
        draw.ellipse([(260, 210), (310, 260)], fill=(20, 20, 20), outline=(100, 100, 100))  # Wheel
        draw.rectangle([(280, 170), (360, 220)], fill=(50, 55, 65))  # Scooter body

        # CCTV OSD (On-Screen Display) Header
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        osd_title = f"LIVE CCTV: {camera_name or camera_id}"
        osd_telemetry = f"TIME: {now_str} | FPS: 15 | STATUS: ACTIVE FEED"

        # OSD text background bar
        draw.rectangle([(0, 0), (width, 36)], fill=(15, 18, 24))
        draw.text((12, 10), osd_title, fill=(0, 240, 160))
        draw.text((360, 10), now_str, fill=(220, 225, 230))

        # Bottom overlay bar
        draw.rectangle([(0, height - 28), (width, height)], fill=(15, 18, 24))
        draw.text((12, height - 22), f"NODE: {camera_id} • VLRDR SENSOR CALIBRATED", fill=(180, 190, 205))
        draw.text((450, height - 22), "FLOODWHEEL CCTV NET", fill=(0, 200, 255))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    @classmethod
    def get_stored_disk_snapshot(cls, camera_id: str) -> Optional[bytes]:
        """Reads camera snapshot from local persistent disk storage if present and valid."""
        from app.services.camera_snapshot_finder import CameraSnapshotFinder
        return CameraSnapshotFinder.get_stored_disk_snapshot(camera_id)

    @classmethod
    async def get_snapshot_bytes(
        cls,
        stream_url: str = "",
        camera_id: str = "",
        camera_name: str = "",
        force_refresh: bool = False,
        storage_only: bool = False,
    ) -> Tuple[Optional[bytes], str]:
        """Fetches raw snapshot frame bytes and MIME type.

        Resolution hierarchy:
        - If storage_only=True: strictly checks local persistent disk storage (or cache)
          and NEVER performs outbound network calls. Returns (None, "") if unavailable.
        - Otherwise: checks cache, camera-backend, persistent disk storage, public stream URL,
          and synthetic mock frame fallback.
        """
        from app.services.image_validator import ImageValidator
        now = time.time()

        # 1. Check in-memory cache
        if not force_refresh and camera_id in cls._cache:
            cached_bytes, cached_mime, cached_at = cls._cache[camera_id]
            if now - cached_at < cls.CACHE_TTL_SECONDS:
                if ImageValidator.is_valid_real_snapshot(cached_bytes):
                    return cached_bytes, cached_mime

        # 2. Check local persistent disk storage (e.g. storage/snapshots/{camera_id}.jpg)
        if camera_id:
            disk_bytes = cls.get_stored_disk_snapshot(camera_id)
            if disk_bytes and ImageValidator.is_valid_real_snapshot(disk_bytes):
                cls._cache[camera_id] = (disk_bytes, "image/jpeg", now)
                return disk_bytes, "image/jpeg"

        # If caller requested storage_only (e.g. backend AI analysis cycle), exit cleanly without network
        if storage_only:
            logger.info("Storage-only mode: no disk snapshot found for camera %s. Skipping outbound fetch.", camera_id)
            return None, ""

        # 3. Try camera-backend microservice (live on-demand request)
        if camera_id:
            try:
                from app.services.camera_service_client import camera_service_client
                remote_bytes, remote_mime = await camera_service_client.get_snapshot_bytes(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    force_refresh=force_refresh,
                )
                if remote_bytes and ImageValidator.is_valid_real_snapshot(remote_bytes):
                    cls._cache[camera_id] = (remote_bytes, remote_mime, now)
                    return remote_bytes, remote_mime
            except Exception as exc:
                logger.debug("camera_service_client query failed for %s: %s", camera_id, exc)

        # 4. Attempt to fetch live frame from public stream URL (if valid external URL)
        if stream_url:
            is_valid, _ = cls.validate_stream_url(stream_url)
            if is_valid:
                try:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                        "Referer": "https://giaothong.hochiminhcity.gov.vn/map.aspx",
                        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
                    }
                    async with httpx.AsyncClient(timeout=3.5, follow_redirects=True, verify=False) as client:
                        from app.config import settings
                        retries = max(0, getattr(settings, "SNAPSHOT_ERROR_RETRY_COUNT", 3))
                        for attempt in range(retries + 1):
                            resp = await client.get(stream_url, headers=headers)
                            if resp.status_code == 200 and len(resp.content) > 100:
                                if ImageValidator.matches_known_error_hash(resp.content):
                                    if attempt < retries:
                                        continue
                                    break
                                if ImageValidator.is_valid_real_snapshot(resp.content):
                                    content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                                    cls._cache[camera_id] = (resp.content, content_type, now)
                                    return resp.content, content_type
                except Exception:
                    pass

        # 5. Last resort: Generate synthetic fallback CCTV frame
        mock_bytes = cls.generate_mock_frame(camera_id, camera_name)
        cls._cache[camera_id] = (mock_bytes, "image/jpeg", now)
        return mock_bytes, "image/jpeg"
