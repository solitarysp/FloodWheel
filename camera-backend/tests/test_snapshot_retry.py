"""Unit tests for snapshot error placeholder automatic retry mechanism."""

import asyncio
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from pathlib import Path

from app.core.config import settings
from app.providers.hcmc_snapshot import HCMCSnapshotHandler
from app.services.image_validator import ImageValidator


class TestSnapshotRetry(unittest.TestCase):
    """Verifies that images matching KNOWN_ERROR_MD5 and KNOWN_ERROR_SHA256 trigger retries."""

    def setUp(self):
        # Municipal error placeholder frame (MD5: 9653ea117b2c39d4c477b0949f95860e)
        sample_path = Path(__file__).parent.parent / "sample_error_snapshot.jpeg"
        if sample_path.exists():
            self.error_md5_frame = sample_path.read_bytes()
        else:
            self.error_md5_frame = b"\x89PNG\r\n\x1a\n" + b"\x00" * 1000
        # Genuine live JPEG frame
        self.valid_jpeg_frame = b"\xff\xd8\xff\xe0" + b"\x01\x02\x03\x04" * 150

        # Synthetic fallback frame
        self.synthetic_frame = b"\xff\xd8\xff\xe0" + b"SYNTHETIC" * 60

        self.mock_client = MagicMock()
        self.mock_storage = MagicMock()
        self.mock_storage.get_snapshot = AsyncMock(return_value=None)
        self.handler = HCMCSnapshotHandler(
            client=self.mock_client,
            storage_service=self.mock_storage,
        )

    def _make_response(self, content: bytes, status_code: int = 200):
        resp = MagicMock()
        resp.status_code = status_code
        resp.content = content
        resp.raise_for_status = MagicMock()
        return resp

    def test_retry_success_after_initial_error_hash(self):
        """When initial fetch returns 9653ea11... but retry succeeds, returns live frame."""
        async def _run():
            # Attempt 1: error hash, Attempt 2: valid JPEG
            self.mock_client.get = AsyncMock(side_effect=[
                self._make_response(self.error_md5_frame),
                self._make_response(self.valid_jpeg_frame),
            ])

            reauth_mock = AsyncMock(return_value={})
            frame, source = await self.handler.get_snapshot(
                camera_id="cam_retry_1",
                cookies={},
                reauth_callback=reauth_mock,
            )

            self.assertEqual(frame, self.valid_jpeg_frame)
            self.assertEqual(source, "live")
            self.assertEqual(self.mock_client.get.call_count, 2)

        asyncio.run(_run())

    def test_retries_exhausted_falls_back_to_synthetic(self):
        """When all retries return error hash, falls back after N configured retries."""
        async def _run():
            # Initial (1) + 3 retries = 4 responses with error hash
            self.mock_client.get = AsyncMock(return_value=self._make_response(self.error_md5_frame))

            reauth_mock = AsyncMock(return_value={})
            with patch.object(settings, "SNAPSHOT_ERROR_RETRY_COUNT", 3):
                with patch.object(settings, "SNAPSHOT_ERROR_RETRY_DELAY_SECONDS", 0.0):
                    frame, source = await self.handler.get_snapshot(
                        camera_id="cam_retry_exhausted",
                        cookies={},
                        reauth_callback=reauth_mock,
                    )

            # 1 initial + 3 retries = 4 calls
            self.assertEqual(self.mock_client.get.call_count, 4)
            self.assertEqual(source, "synthetic")
            self.assertNotEqual(frame, self.error_md5_frame)

        asyncio.run(_run())

    def test_custom_retry_count_from_config(self):
        """Verifies custom N retry count (e.g. N=1) is strictly respected."""
        async def _run():
            self.mock_client.get = AsyncMock(return_value=self._make_response(self.error_md5_frame))

            reauth_mock = AsyncMock(return_value={})
            with patch.object(settings, "SNAPSHOT_ERROR_RETRY_COUNT", 1):
                with patch.object(settings, "SNAPSHOT_ERROR_RETRY_DELAY_SECONDS", 0.0):
                    frame, source = await self.handler.get_snapshot(
                        camera_id="cam_retry_count_1",
                        cookies={},
                        reauth_callback=reauth_mock,
                    )

            # 1 initial + 1 retry = 2 calls
            self.assertEqual(self.mock_client.get.call_count, 2)
            self.assertEqual(source, "synthetic")

        asyncio.run(_run())

    def test_zero_retry_count_breaks_immediately(self):
        """When retry count is 0, does not retry error hash."""
        async def _run():
            self.mock_client.get = AsyncMock(return_value=self._make_response(self.error_md5_frame))

            reauth_mock = AsyncMock(return_value={})
            with patch.object(settings, "SNAPSHOT_ERROR_RETRY_COUNT", 0):
                frame, source = await self.handler.get_snapshot(
                    camera_id="cam_retry_zero",
                    cookies={},
                    reauth_callback=reauth_mock,
                )

            # 1 initial + 0 retries = 1 call
            self.assertEqual(self.mock_client.get.call_count, 1)
            self.assertEqual(source, "synthetic")

        asyncio.run(_run())

    def test_valid_image_does_not_trigger_retry(self):
        """When initial fetch is genuine live frame, does not trigger any retries."""
        async def _run():
            self.mock_client.get = AsyncMock(return_value=self._make_response(self.valid_jpeg_frame))

            reauth_mock = AsyncMock(return_value={})
            frame, source = await self.handler.get_snapshot(
                camera_id="cam_valid_immediate",
                cookies={},
                reauth_callback=reauth_mock,
            )

            self.assertEqual(self.mock_client.get.call_count, 1)
            self.assertEqual(frame, self.valid_jpeg_frame)
            self.assertEqual(source, "live")

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
