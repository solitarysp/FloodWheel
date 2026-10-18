"""Unit tests for CameraRegistry service and concurrency-safe zone/camera ensure logic."""

from datetime import datetime, timezone
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.models.db_models import Camera, FloodZone
from app.services.camera_registry import CameraRegistry


class TestCameraRegistry(unittest.IsolatedAsyncioTestCase):
    """Test suite for CameraRegistry."""

    async def test_ensure_camera_and_zone_creates_new_records(self):
        """Verifies ensure_camera_and_zone creates records if not present."""
        mock_session = AsyncMock()
        mock_session.get.side_effect = [None, None]

        cam = await CameraRegistry.ensure_camera_and_zone(
            session=mock_session,
            camera_id="cam-q1-01",
            name="Camera Lê Lợi",
            location="Quận 1",
            latitude=10.7769,
            longitude=106.7009,
            status="ONLINE",
        )

        self.assertIsNotNone(cam)
        self.assertEqual(cam.id, "cam-q1-01")
        self.assertEqual(cam.zone_id, "zone-quan-1")
        self.assertEqual(cam.status, "ONLINE")
        self.assertTrue(mock_session.execute.called)

    async def test_ensure_camera_and_zone_when_already_exists(self):
        """Verifies ensure_camera_and_zone returns existing records safely."""
        mock_session = AsyncMock()
        existing_zone = FloodZone(
            id="zone-quan-1",
            name="Khu vực Quận 1",
            district="Quận 1",
            city="hcmc",
            center_lat=10.7769,
            center_lng=106.7009,
            geometry_geojson="{}",
        )
        existing_cam = Camera(
            id="cam-q1-01",
            name="Camera Lê Lợi",
            location="Quận 1",
            latitude=10.7769,
            longitude=106.7009,
            zone_id="zone-quan-1",
            status="ONLINE",
            stream_url="/cameras/cam-q1-01/snapshot",
        )
        mock_session.get.side_effect = [existing_zone, existing_cam]

        cam = await CameraRegistry.ensure_camera_and_zone(
            session=mock_session,
            camera_id="cam-q1-01",
            name="Camera Lê Lợi",
            location="Quận 1",
            latitude=10.7769,
            longitude=106.7009,
            status="ONLINE",
        )

        self.assertEqual(cam.id, "cam-q1-01")
        self.assertEqual(cam.zone_id, "zone-quan-1")
        self.assertFalse(mock_session.execute.called)

    async def test_slugify(self):
        """Verifies Vietnamese district names are cleanly converted to ASCII slugs."""
        self.assertEqual(CameraRegistry._slugify("Quận 1"), "quan-1")
        self.assertEqual(CameraRegistry._slugify("Bình Thạnh"), "binh-thanh")
        self.assertEqual(CameraRegistry._slugify("Thành phố Thủ Đức"), "thanh-pho-thu-duc")
