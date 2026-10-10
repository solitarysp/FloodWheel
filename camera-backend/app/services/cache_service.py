"""Redis Cache Service with in-memory fallback.

Provides low-latency caching for binary JPEG camera frames,
session authentication cookies, and provider camera catalogs.
"""

from datetime import datetime, timezone
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from app.core.config import settings

logger = logging.getLogger("camera_service.cache")


class CacheService:
    """Async Redis cache client with automatic in-memory fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis: Optional[Any] = None
        self._connected: bool = False

        # In-memory fallback stores: key -> (value, expiry_timestamp)
        self._mem_bytes: Dict[str, Tuple[bytes, float]] = {}
        self._mem_text: Dict[str, Tuple[str, float]] = {}

    async def connect(self) -> bool:
        """Initializes connection to Redis."""
        if aioredis is None:
            logger.warning("redis.asyncio not installed. Operating in in-memory fallback mode.")
            return False

        try:
            self._redis = aioredis.from_url(
                self.redis_url,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=False,  # default False for raw bytes
            )
            await self._redis.ping()
            self._connected = True
            logger.info("Connected to Redis cache at %s", self.redis_url)
            return True
        except Exception as exc:
            logger.warning("Redis connection failed (%s). Falling back to in-memory cache.", exc)
            self._redis = None
            self._connected = False
            return False

    async def close(self):
        """Closes Redis connections."""
        if self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass
            self._connected = False

    def is_connected(self) -> bool:
        """Returns whether Redis is currently connected."""
        return self._connected

    # =========================================================================
    # Snapshot Caching (Binary JPEG)
    # =========================================================================

    async def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        """Retrieves cached JPEG image bytes for a camera ID."""
        key = f"camera:snapshot:{camera_id}"
        if self._connected and self._redis:
            try:
                data = await self._redis.get(key)
                if data:
                    return data
            except Exception as exc:
                logger.warning("Redis get_snapshot error: %s", exc)

        # In-memory check
        now = time.time()
        if key in self._mem_bytes:
            data, expiry = self._mem_bytes[key]
            if now < expiry:
                return data
            else:
                del self._mem_bytes[key]
        return None

    async def set_snapshot(
        self,
        camera_id: str,
        image_bytes: bytes,
        ttl: Optional[float] = None,
    ):
        """Caches JPEG snapshot bytes with TTL (default 10s)."""
        key = f"camera:snapshot:{camera_id}"
        ttl_seconds = int(ttl if ttl is not None else settings.SNAPSHOT_CACHE_TTL_SECONDS)

        if self._connected and self._redis:
            try:
                await self._redis.set(key, image_bytes, ex=ttl_seconds)
                return
            except Exception as exc:
                logger.warning("Redis set_snapshot error: %s", exc)

        # In-memory fallback
        self._mem_bytes[key] = (image_bytes, time.time() + ttl_seconds)
        # Periodic cleanup of in-memory store if size > 1000
        if len(self._mem_bytes) > 1000:
            now = time.time()
            self._mem_bytes = {k: v for k, v in self._mem_bytes.items() if v[1] > now}

    # =========================================================================
    # Session Cookies Caching
    # =========================================================================

    async def get_session_cookies(self, provider: str) -> Optional[Dict[str, str]]:
        """Retrieves cached session cookies dict for a provider."""
        key = f"camera:cookies:{provider}"
        if self._connected and self._redis:
            try:
                raw = await self._redis.get(key)
                if raw:
                    return json.loads(raw.decode("utf-8"))
            except Exception as exc:
                logger.warning("Redis get_session_cookies error: %s", exc)

        # In-memory check
        now = time.time()
        if key in self._mem_text:
            raw_str, expiry = self._mem_text[key]
            if now < expiry:
                return json.loads(raw_str)
            else:
                del self._mem_text[key]
        return None

    async def set_session_cookies(
        self,
        provider: str,
        cookies: Dict[str, str],
        ttl: Optional[float] = None,
    ):
        """Caches session cookies with TTL (default 15 minutes)."""
        key = f"camera:cookies:{provider}"
        ttl_seconds = int(ttl if ttl is not None else settings.SESSION_COOKIE_TTL_SECONDS)
        raw_str = json.dumps(cookies)

        if self._connected and self._redis:
            try:
                await self._redis.set(key, raw_str.encode("utf-8"), ex=ttl_seconds)
                return
            except Exception as exc:
                logger.warning("Redis set_session_cookies error: %s", exc)

        self._mem_text[key] = (raw_str, time.time() + ttl_seconds)

    # =========================================================================
    # Catalog Caching
    # =========================================================================

    async def get_catalog(self, city: str) -> Optional[List[Dict[str, Any]]]:
        """Retrieves cached camera catalog list for a city."""
        key = f"camera:catalog:{city}"
        if self._connected and self._redis:
            try:
                raw = await self._redis.get(key)
                if raw:
                    return json.loads(raw.decode("utf-8"))
            except Exception as exc:
                logger.warning("Redis get_catalog error: %s", exc)

        now = time.time()
        if key in self._mem_text:
            raw_str, expiry = self._mem_text[key]
            if now < expiry:
                return json.loads(raw_str)
            else:
                del self._mem_text[key]
        return None

    async def set_catalog(
        self,
        city: str,
        items: List[Dict[str, Any]],
        ttl: Optional[float] = None,
    ):
        """Caches camera catalog list with TTL (default 6 hours)."""
        key = f"camera:catalog:{city}"
        ttl_seconds = int(ttl if ttl is not None else settings.CATALOG_SYNC_INTERVAL_SECONDS)
        raw_str = json.dumps(items)

        if self._connected and self._redis:
            try:
                await self._redis.set(key, raw_str.encode("utf-8"), ex=ttl_seconds)
                return
            except Exception as exc:
                logger.warning("Redis set_catalog error: %s", exc)

        self._mem_text[key] = (raw_str, time.time() + ttl_seconds)
