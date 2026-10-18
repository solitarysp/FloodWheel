"""Unit tests for SnapshotStorageService."""

import asyncio
from pathlib import Path
import shutil
import tempfile
import unittest

from app.services.storage_service import SnapshotStorageService


class TestSnapshotStorageService(unittest.TestCase):
    """Test suite for snapshot file storage service."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_snapshots_")
        self.service = SnapshotStorageService(storage_dir=self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_sanitization(self):
        """Path traversal characters must be sanitized."""
        path = self.service.get_snapshot_path("../../../evil/id")
        self.assertTrue(path.name.endswith(".jpg"))
        self.assertNotIn("..", str(path))
        self.assertEqual(path.parent.resolve(), Path(self.temp_dir).resolve())

    def test_save_and_get_snapshot(self):
        """Tests async write and read cycle."""
        async def _test():
            cam_id = "cam_d1_001"
            data = b"\xff\xd8\xff\xe0" + b"TEST_IMAGE_DATA" * 50

            # Initially missing
            has_before = await self.service.has_snapshot(cam_id)
            self.assertFalse(has_before)
            read_before = await self.service.get_snapshot(cam_id)
            self.assertIsNone(read_before)

            # Save
            saved_path = await self.service.save_snapshot(cam_id, data)
            self.assertIsNotNone(saved_path)
            self.assertTrue(saved_path.exists())

            # Read back
            has_after = await self.service.has_snapshot(cam_id)
            self.assertTrue(has_after)
            read_after = await self.service.get_snapshot(cam_id)
            self.assertEqual(read_after, data)

        asyncio.run(_test())

    def test_overwrite_snapshot(self):
        """Saving newer frames must cleanly overwrite old frames."""
        async def _test():
            cam_id = "cam_d1_002"
            frame1 = b"\xff\xd8\xff\xe0" + b"FRAME_ONE" * 30
            frame2 = b"\xff\xd8\xff\xe0" + b"FRAME_TWO" * 30

            await self.service.save_snapshot(cam_id, frame1)
            self.assertEqual(await self.service.get_snapshot(cam_id), frame1)

            await self.service.save_snapshot(cam_id, frame2)
            self.assertEqual(await self.service.get_snapshot(cam_id), frame2)

        asyncio.run(_test())

    def test_delete_snapshot(self):
        """Tests snapshot deletion."""
        async def _test():
            cam_id = "cam_d1_003"
            data = b"\xff\xd8\xff\xe0" + b"TO_DELETE" * 30

            await self.service.save_snapshot(cam_id, data)
            self.assertTrue(await self.service.has_snapshot(cam_id))

            deleted = await self.service.delete_snapshot(cam_id)
            self.assertTrue(deleted)
            self.assertFalse(await self.service.has_snapshot(cam_id))

        asyncio.run(_test())


if __name__ == "__main__":
    unittest.main()
