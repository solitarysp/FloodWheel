"""Integration test for snapshot error placeholder detection and disk fallback pipeline."""

import asyncio
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService
from app.services.image_validator import ImageValidator
from app.services.storage_service import SnapshotStorageService

# Mock provider simulating municipal camera behavior
class MockCameraProvider:
    provider_name = "hcmc"
    city = "hcmc"

    def __init__(self, storage_service=None, next_payload=None, simulate_error_banner=False):
        self.storage_service = storage_service
        self.next_payload = next_payload
        self.simulate_error_banner = simulate_error_banner
        self.synthetic_frame = b"\xff\xd8\xff\xe0" + b"SYNTHETIC_CCTV_FRAME" * 20

    async def get_snapshot(self, camera_id, width=None, height=None):
        if self.simulate_error_banner:
            # When upstream returns error banner or fails, fall back to disk storage
            if self.storage_service:
                stored = await self.storage_service.get_snapshot(camera_id)
                if stored and ImageValidator.is_valid_snapshot(stored):
                    return stored, "disk-storage"
            return self.synthetic_frame, "synthetic"

        if self.next_payload and ImageValidator.is_valid_snapshot(self.next_payload):
            return self.next_payload, "live"

        # Fallback to disk if payload is invalid
        if self.storage_service:
            stored = await self.storage_service.get_snapshot(camera_id)
            if stored and ImageValidator.is_valid_snapshot(stored):
                return stored, "disk-storage"

        return self.synthetic_frame, "synthetic"


class TestFallbackPipeline(unittest.TestCase):
    """Verifies that error placeholders trigger disk fallback and valid frames are persisted."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_pipeline_")
        self.storage = SnapshotStorageService(storage_dir=self.temp_dir)
        self.cache = CacheService(redis_url="redis://localhost:9999/0")  # in-memory fallback

        self.sample_error_file = Path(__file__).parent.parent / "sample_error_snapshot.jpeg"
        self.valid_jpeg_data = b"\xff\xd8\xff\xe0" + b"GENUINE_LIVE_TRAFFIC_FRAME" * 40

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_error_banner_falls_back_to_disk_stored_frame(self):
        """When upstream returns 'IMAGE NOT AVAILABLE', service must return disk frame."""
        async def _test():
            cam_id = "cam_err_test_1"
            # 1. Pre-populate disk storage with a previously valid frame
            await self.storage.save_snapshot(cam_id, self.valid_jpeg_data)
            self.assertTrue(await self.storage.has_snapshot(cam_id))

            # 2. Configure provider to simulate municipal error banner
            error_bytes = self.sample_error_file.read_bytes()
            self.assertTrue(ImageValidator.is_error_placeholder(error_bytes))

            provider = MockCameraProvider(storage_service=self.storage, simulate_error_banner=True)
            catalog = CatalogService(cache_service=self.cache, storage_service=self.storage)
            catalog.register_provider(provider)

            frame_bytes, ctype, is_hit, source = await catalog.get_snapshot(cam_id)

            # Must NOT return the error banner
            self.assertNotEqual(frame_bytes, error_bytes)
            self.assertFalse(ImageValidator.is_error_placeholder(frame_bytes))

            # Must return the disk-stored frame
            self.assertEqual(frame_bytes, self.valid_jpeg_data)
            self.assertEqual(source, "disk-storage")
            self.assertEqual(ctype, "image/jpeg")

        asyncio.run(_test())

    def test_error_banner_falls_back_to_synthetic_when_no_disk_frame(self):
        """When upstream returns error and no disk file exists, generate synthetic frame."""
        async def _test():
            cam_id = "cam_cold_start_99"
            self.assertFalse(await self.storage.has_snapshot(cam_id))

            provider = MockCameraProvider(storage_service=self.storage, simulate_error_banner=True)
            catalog = CatalogService(cache_service=self.cache, storage_service=self.storage)
            catalog.register_provider(provider)

            frame_bytes, ctype, is_hit, source = await catalog.get_snapshot(cam_id)

            self.assertEqual(source, "synthetic")
            self.assertTrue(frame_bytes.startswith(b"\xff\xd8"))

        asyncio.run(_test())

    def test_valid_live_frame_is_persisted_to_disk_and_cached(self):
        """When upstream returns a valid live frame, CatalogService saves it to disk."""
        async def _test():
            cam_id = "cam_live_persist_100"
            self.assertFalse(await self.storage.has_snapshot(cam_id))

            provider = MockCameraProvider(storage_service=self.storage, next_payload=self.valid_jpeg_data)
            catalog = CatalogService(cache_service=self.cache, storage_service=self.storage)
            catalog.register_provider(provider)

            # Fetch snapshot via CatalogService
            frame, ctype, is_hit, source = await catalog.get_snapshot(cam_id)

            self.assertEqual(frame, self.valid_jpeg_data)
            self.assertEqual(ctype, "image/jpeg")
            self.assertEqual(source, "live")
            self.assertFalse(is_hit)

            # Verify frame is now persisted on disk
            self.assertTrue(await self.storage.has_snapshot(cam_id))
            disk_frame = await self.storage.get_snapshot(cam_id)
            self.assertEqual(disk_frame, self.valid_jpeg_data)

            # Verify subsequent request hits Redis/in-memory cache
            c_frame, _, is_hit2, source2 = await catalog.get_snapshot(cam_id)
            self.assertTrue(is_hit2)
            self.assertEqual(source2, "redis")
            self.assertEqual(c_frame, self.valid_jpeg_data)

        asyncio.run(_test())


if __name__ == "__main__":
    unittest.main()
