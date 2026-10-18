import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
try:
    import pytest
except ImportError:
    class _MockPytest:
        class mark:
            @staticmethod
            def asyncio(fn):
                return fn
    pytest = _MockPytest()

from app.models.camera import CameraDTO
from app.services.snapshot_crawler import SnapshotCrawlerService


@pytest.mark.asyncio
async def test_snapshot_crawler_cycle_success(tmp_path):
    # Setup mocks
    mock_catalog = MagicMock()
    mock_storage = MagicMock()
    mock_storage.save_snapshot = AsyncMock()
    mock_cache = MagicMock()
    mock_cache.set_snapshot = AsyncMock()

    # Generate a dummy real snapshot (>100 bytes)
    dummy_frame = b"\xff\xd8\xff\xe0" + b"\x00" * 200 + b"\xff\xd9"

    mock_provider = MagicMock()
    mock_provider.get_snapshot = AsyncMock(return_value=(dummy_frame, "live"))
    mock_catalog._providers = {"hcmc": mock_provider}

    cam1 = CameraDTO(id="cam_001", name="Camera 1", latitude=10.7, longitude=106.7)
    cam2 = CameraDTO(id="cam_002", name="Camera 2", latitude=10.8, longitude=106.8)
    mock_catalog._cameras_by_id = {"cam_001": cam1, "cam_002": cam2}

    crawler = SnapshotCrawlerService(
        catalog_service=mock_catalog,
        storage_service=mock_storage,
        cache_service=mock_cache,
        interval_seconds=600,
        concurrency=1,
        delay_seconds=0.0,
    )

    with patch("app.services.snapshot_crawler.ImageValidator.is_valid_snapshot", return_value=True):
        telemetry = await crawler.run_crawl_cycle()

    assert telemetry["status"] == "IDLE"
    assert telemetry["stats"]["total_crawled"] == 2
    assert telemetry["stats"]["success"] == 2
    assert telemetry["stats"]["failed"] == 0
    assert mock_storage.save_snapshot.call_count == 2
    assert mock_cache.set_snapshot.call_count == 2


@pytest.mark.asyncio
async def test_snapshot_crawler_skips_invalid_frame():
    mock_catalog = MagicMock()
    mock_storage = MagicMock()
    mock_storage.save_snapshot = AsyncMock()
    mock_cache = MagicMock()
    mock_cache.set_snapshot = AsyncMock()

    mock_provider = MagicMock()
    mock_provider.get_snapshot = AsyncMock(return_value=(b"corrupt-data", "live"))
    mock_catalog._providers = {"hcmc": mock_provider}

    cam = CameraDTO(id="cam_bad", name="Bad Camera", latitude=10.7, longitude=106.7)
    mock_catalog._cameras_by_id = {"cam_bad": cam}

    crawler = SnapshotCrawlerService(
        catalog_service=mock_catalog,
        storage_service=mock_storage,
        cache_service=mock_cache,
    )

    with patch("app.services.snapshot_crawler.ImageValidator.is_valid_snapshot", return_value=False):
        telemetry = await crawler.run_crawl_cycle()

    assert telemetry["stats"]["success"] == 0
    assert telemetry["stats"]["skipped"] == 1
    mock_storage.save_snapshot.assert_not_called()
    mock_cache.set_snapshot.assert_not_called()
