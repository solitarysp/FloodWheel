"""Session and Cookie Management for HCMC Traffic Camera Provider.

Handles session cookie acquisition (.VDMS), Redis caching, validation,
and automatic periodic retries (every 5 minutes) upon failure.
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Callable, Dict, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from app.core.config import settings

logger = logging.getLogger("camera_service.hcmc_session")


class HCMCSessionManager:
    """Manages session lifecycle, cookie caching, and self-healing retry loop."""

    def __init__(
        self,
        client: Any,
        cache_service: Optional[Any] = None,
        retry_interval_seconds: Optional[int] = None,
        on_recovered_callback: Optional[Callable[[], Any]] = None,
    ):
        self._client = client
        self.cache_service = cache_service
        self.retry_interval_seconds = (
            retry_interval_seconds
            if retry_interval_seconds is not None
            else getattr(settings, "COOKIE_RETRY_INTERVAL_SECONDS", 300)
        )
        self.on_recovered_callback = on_recovered_callback

        self._cookies: Dict[str, str] = {}
        self._auth_lock = asyncio.Lock()
        self._retry_task: Optional[asyncio.Task] = None
        self._last_error: Optional[str] = None
        self._last_success_at: Optional[datetime] = None
        self._retry_attempts: int = 0

    @property
    def cookies(self) -> Dict[str, str]:
        """Returns the current cookie dictionary."""
        return self._cookies

    @cookies.setter
    def cookies(self, value: Dict[str, str]):
        self._cookies = value or {}

    @staticmethod
    def is_cookie_valid(cookies: Optional[Dict[str, str]]) -> bool:
        """Verifies that cookies dictionary is non-empty and contains .VDMS."""
        return bool(cookies and ".VDMS" in cookies and bool(cookies[".VDMS"].strip()))

    async def fetch_cookie_from_portal(self) -> Dict[str, str]:
        """Requests map.aspx from HCMC portal and extracts cookies."""
        logger.info("Requesting session cookies from HCMC portal: %s", settings.HCMC_MAP_URL)
        resp = await self._client.get(settings.HCMC_MAP_URL)
        resp.raise_for_status()

        new_cookies = dict(resp.cookies)
        for header_val in resp.headers.get_list("set-cookie"):
            parts = header_val.split(";")[0].split("=", 1)
            if len(parts) == 2:
                new_cookies[parts[0].strip()] = parts[1].strip()

        if not self.is_cookie_valid(new_cookies):
            raise ValueError("HCMC portal responded without a valid .VDMS session cookie")

        return new_cookies

    async def ensure_session(self, force: bool = False) -> Dict[str, str]:
        """Ensures a valid session cookie exists; fetches new if expired/forced.

        If fetching fails, immediately schedules/maintains a 5-minute retry loop until success.
        """
        async with self._auth_lock:
            if not force:
                if self.cache_service:
                    cached = await self.cache_service.get_session_cookies("hcmc")
                    if self.is_cookie_valid(cached):
                        self._cookies = cached
                        return self._cookies

                if self.is_cookie_valid(self._cookies):
                    return self._cookies

            logger.info("Attempting immediate cookie refresh (force=%s)...", force)
            try:
                new_cookies = await self.fetch_cookie_from_portal()
                self._cookies = new_cookies
                self._last_error = None
                self._last_success_at = datetime.now(timezone.utc)
                self._stop_retry_task()

                logger.info("Session cookie successfully acquired. .VDMS present: True")
                if self.cache_service and self._cookies:
                    await self.cache_service.set_session_cookies(
                        "hcmc", self._cookies, ttl=settings.SESSION_COOKIE_TTL_SECONDS
                    )
                return self._cookies
            except Exception as exc:
                self._last_error = str(exc)
                logger.error(
                    "Cookie acquisition failed: %s. Initiating retry loop every %ds (5 mins) until success.",
                    exc, self.retry_interval_seconds
                )
                self.start_retry_loop()
                return self._cookies

    def start_retry_loop(self):
        """Starts background task to retry acquiring cookie every 5 minutes until success."""
        if self._retry_task is None or self._retry_task.done():
            self._retry_task = asyncio.create_task(self._retry_worker())
            logger.info("Background cookie retry worker initiated (interval: %ds).", self.retry_interval_seconds)

    def _stop_retry_task(self):
        """Cancels background retry task if active."""
        if self._retry_task and not self._retry_task.done():
            self._retry_task.cancel()
            self._retry_task = None
            self._retry_attempts = 0
            logger.info("Background cookie retry worker stopped.")

    async def _retry_worker(self):
        """Worker loop that retries acquiring cookie every 5 minutes until successful."""
        while True:
            try:
                self._retry_attempts += 1
                logger.warning(
                    "Cookie retry worker sleeping %ds (5 mins) before attempt #%d...",
                    self.retry_interval_seconds, self._retry_attempts
                )
                await asyncio.sleep(self.retry_interval_seconds)

                logger.info("Cookie retry worker executing attempt #%d...", self._retry_attempts)
                new_cookies = await self.fetch_cookie_from_portal()

                async with self._auth_lock:
                    self._cookies = new_cookies
                    self._last_error = None
                    self._last_success_at = datetime.now(timezone.utc)
                    if self.cache_service and self._cookies:
                        await self.cache_service.set_session_cookies(
                            "hcmc", self._cookies, ttl=settings.SESSION_COOKIE_TTL_SECONDS
                        )

                logger.info(
                    "Cookie retry worker SUCCEEDED after %d attempt(s)! Session cookie restored.",
                    self._retry_attempts
                )
                self._retry_attempts = 0

                if self.on_recovered_callback:
                    try:
                        res = self.on_recovered_callback()
                        if asyncio.iscoroutine(res):
                            await res
                    except Exception as cb_exc:
                        logger.warning("Error running on_recovered_callback: %s", cb_exc)

                break
            except asyncio.CancelledError:
                logger.info("Cookie retry worker cancelled.")
                break
            except Exception as exc:
                self._last_error = str(exc)
                logger.warning(
                    "Cookie retry attempt #%d failed: %s. Will retry again in %ds (5 mins)...",
                    self._retry_attempts, exc, self.retry_interval_seconds
                )

    async def close(self):
        """Stops background retry tasks cleanly."""
        self._stop_retry_task()

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns diagnostic telemetry on cookie session health."""
        is_retrying = bool(self._retry_task and not self._retry_task.done())
        return {
            "has_valid_cookie": self.is_cookie_valid(self._cookies),
            "vdms_present": ".VDMS" in self._cookies if self._cookies else False,
            "is_retrying": is_retrying,
            "retry_attempts": self._retry_attempts,
            "retry_interval_seconds": self.retry_interval_seconds,
            "last_error": self._last_error,
            "last_success_at": self._last_success_at.isoformat() if self._last_success_at else None,
        }
