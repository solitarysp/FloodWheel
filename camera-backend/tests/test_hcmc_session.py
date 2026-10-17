"""Unit tests for HCMCSessionManager cookie acquisition and 5-minute retry mechanism."""

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.providers.hcmc_session import HCMCSessionManager
from app.providers.hcmc import HCMCCameraProvider


class TestHCMCSessionManager(unittest.IsolatedAsyncioTestCase):
    """Tests session management, cookie parsing, validation, and auto-retry on failure."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_cache = MagicMock()
        self.mock_cache.get_session_cookies = AsyncMock(return_value=None)
        self.mock_cache.set_session_cookies = AsyncMock(return_value=True)

        self.session_mgr = HCMCSessionManager(
            client=self.mock_client,
            cache_service=self.mock_cache,
            retry_interval_seconds=1,  # Short interval for test
        )

    async def asyncTearDown(self):
        await self.session_mgr.close()

    def _make_response(self, cookies: dict, set_cookie_headers: list = None, status_code: int = 200):
        resp = MagicMock()
        resp.status_code = status_code
        resp.cookies = cookies
        headers_mock = MagicMock()
        headers_mock.get_list.return_value = set_cookie_headers or []
        resp.headers = headers_mock
        resp.raise_for_status = MagicMock()
        return resp

    def test_is_cookie_valid(self):
        """Verifies cookie validation logic."""
        self.assertFalse(HCMCSessionManager.is_cookie_valid(None))
        self.assertFalse(HCMCSessionManager.is_cookie_valid({}))
        self.assertFalse(HCMCSessionManager.is_cookie_valid({"ASP.NET_SessionId": "123"}))
        self.assertFalse(HCMCSessionManager.is_cookie_valid({".VDMS": ""}))
        self.assertTrue(HCMCSessionManager.is_cookie_valid({".VDMS": "valid_token"}))

    async def test_fetch_cookie_success(self):
        """Fetches and parses cookies from portal successfully."""
        self.mock_client.get = AsyncMock(return_value=self._make_response(
            cookies={"session": "abc"},
            set_cookie_headers=[".VDMS=token123; path=/; HttpOnly"],
        ))

        cookies = await self.session_mgr.fetch_cookie_from_portal()
        self.assertEqual(cookies.get(".VDMS"), "token123")
        self.assertEqual(cookies.get("session"), "abc")

    async def test_fetch_cookie_missing_vdms_raises_error(self):
        """Raises ValueError if portal returns response without .VDMS."""
        self.mock_client.get = AsyncMock(return_value=self._make_response(
            cookies={"foo": "bar"},
            set_cookie_headers=[],
        ))

        with self.assertRaises(ValueError):
            await self.session_mgr.fetch_cookie_from_portal()

    async def test_ensure_session_uses_cached_cookie(self):
        """Uses cached cookie if valid without calling HTTP endpoint."""
        self.mock_cache.get_session_cookies = AsyncMock(return_value={".VDMS": "cached_vdms"})

        cookies = await self.session_mgr.ensure_session(force=False)
        self.assertEqual(cookies[".VDMS"], "cached_vdms")
        self.mock_client.get.assert_not_called()

    async def test_ensure_session_immediate_failure_triggers_retry_loop(self):
        """When immediate fetch fails, starts background retry loop and records error."""
        self.mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))

        cookies = await self.session_mgr.ensure_session(force=True)
        self.assertEqual(cookies, {})
        self.assertIsNotNone(self.session_mgr._retry_task)
        self.assertFalse(self.session_mgr._retry_task.done())
        self.assertIn("Connection refused", self.session_mgr._last_error)

        telemetry = self.session_mgr.get_telemetry()
        self.assertTrue(telemetry["is_retrying"])

    async def test_retry_worker_repeats_until_success(self):
        """Background worker retries every interval until cookie successfully acquired."""
        recovered_callback = AsyncMock()
        mgr = HCMCSessionManager(
            client=self.mock_client,
            cache_service=self.mock_cache,
            retry_interval_seconds=0.01,  # Fast 10ms tick for test
            on_recovered_callback=recovered_callback,
        )

        call_count = 0

        async def _mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception(f"Simulated network outage attempt #{call_count}")
            return self._make_response(cookies={".VDMS": f"recovered_token_{call_count}"})

        self.mock_client.get = AsyncMock(side_effect=_mock_get)

        # Trigger failure and start retry loop
        await mgr.ensure_session(force=True)

        # Wait briefly for worker loop to finish 3 iterations
        await asyncio.sleep(0.08)

        self.assertTrue(mgr.is_cookie_valid(mgr.cookies))
        self.assertIn("recovered_token", mgr.cookies[".VDMS"])
        self.assertTrue(mgr._retry_task is None or mgr._retry_task.done())
        recovered_callback.assert_called_once()
        await mgr.close()

    async def test_external_success_stops_pending_retry_worker(self):
        """An external successful ensure_session stops any running retry loop."""
        mgr = HCMCSessionManager(
            client=self.mock_client,
            cache_service=self.mock_cache,
            retry_interval_seconds=60,  # 60s sleep
        )
        # 1. Trigger failure -> worker starts sleeping
        self.mock_client.get = AsyncMock(side_effect=Exception("First error"))
        await mgr.ensure_session(force=True)
        self.assertTrue(mgr._retry_task and not mgr._retry_task.done())

        # 2. Subsequent call succeeds
        self.mock_client.get = AsyncMock(return_value=self._make_response(cookies={".VDMS": "ok"}))
        await mgr.ensure_session(force=True)

        # Worker should be stopped
        self.assertTrue(mgr._retry_task is None or mgr._retry_task.done())
        self.assertEqual(mgr.cookies[".VDMS"], "ok")
        await mgr.close()


class TestHCMCCameraProviderSessionIntegration(unittest.IsolatedAsyncioTestCase):
    """Verifies HCMCCameraProvider integration with HCMCSessionManager."""

    async def test_provider_health_check_includes_session_telemetry(self):
        """Provider health check exposes session and cookie status."""
        provider = HCMCCameraProvider()
        health = await provider.health_check()
        self.assertIn("session", health)
        self.assertIn("has_valid_cookie", health["session"])
        self.assertIn("is_retrying", health["session"])
        await provider.close()
