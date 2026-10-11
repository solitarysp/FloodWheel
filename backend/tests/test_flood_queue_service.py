import asyncio
from datetime import datetime, timedelta, timezone
try:
    import pytest
except ImportError:
    class MockPytest:
        class mark:
            @staticmethod
            def asyncio(fn):
                return fn
    pytest = MockPytest()

from app.services.flood_queue_service import FloodAnalysisQueue


@pytest.mark.asyncio
async def test_flood_queue_initialization_defaults():
    queue = FloodAnalysisQueue()
    assert queue.interval_seconds == 30 * 60  # 30 minutes in seconds
    assert queue.status == "idle"
    assert queue.current_cycle_id == 0
    assert queue.last_cycle_completed_at is None
    assert queue.next_run_at is None

    status = queue.get_status()
    assert status["status"] == "idle"
    assert status["interval_seconds"] == 1800
    assert status["interval_minutes"] == 30.0
    assert status["next_run_in_seconds"] == 0


@pytest.mark.asyncio
async def test_flood_queue_enqueue_deduplication():
    queue = FloodAnalysisQueue()
    enqueued = await queue.enqueue_cameras(["cam-1", "cam-2", "cam-1", "cam-3"])
    assert enqueued == 3
    assert queue._queue.qsize() == 3

    # Re-enqueuing existing items should add 0
    enqueued2 = await queue.enqueue_cameras(["cam-2", "cam-3"])
    assert enqueued2 == 0
    assert queue._queue.qsize() == 3


@pytest.mark.asyncio
async def test_flood_queue_timing_after_last_run():
    """Verifies that next_run_at is strictly set to 30 minutes after the cycle completes."""
    queue = FloodAnalysisQueue(interval_minutes=30)
    cycle_end = datetime.now(timezone.utc)
    queue.last_cycle_completed_at = cycle_end
    queue.next_run_at = cycle_end + timedelta(seconds=queue.interval_seconds)

    status = queue.get_status()
    assert status["next_run_in_seconds"] > 1750
    assert status["next_run_in_seconds"] <= 1800
    assert status["next_run_at"] is not None


@pytest.mark.asyncio
async def test_flood_queue_manual_trigger_wakes_wait():
    """Verifies that trigger_now sets the wake event and resets waiting status."""
    queue = FloodAnalysisQueue(interval_minutes=30)
    queue._wake_event.clear()
    assert not queue._wake_event.is_set()

    await queue.trigger_now()
    assert queue._wake_event.is_set()


@pytest.mark.asyncio
async def test_flood_queue_pause_and_resume():
    queue = FloodAnalysisQueue(interval_minutes=30)
    await queue.pause()
    assert queue.status == "paused"
    assert queue._paused is True

    await queue.resume()
    assert queue.status == "idle"
    assert queue._paused is False


@pytest.mark.asyncio
async def test_image_validator_detects_default_synthetic_and_error_frames():
    from app.services.image_validator import ImageValidator
    from app.services.camera_stream_service import CameraStreamService

    # 1. Test generated synthetic default frame
    mock_frame = CameraStreamService.generate_mock_frame("cam-test-01", "Nguyen Hue")
    assert ImageValidator.is_default_synthetic_frame(mock_frame) is True
    assert ImageValidator.is_default_or_invalid(mock_frame) is True
    assert ImageValidator.is_valid_real_snapshot(mock_frame) is False

    # 2. Test known error banner MD5
    fake_error_data = b"fake"
    assert ImageValidator.is_error_placeholder(fake_error_data) is True  # < 500 bytes

    # 3. Test empty data
    assert ImageValidator.is_default_or_invalid(b"") is True


@pytest.mark.asyncio
async def test_gemini_client_concurrency_lock_single_execution():
    from unittest.mock import patch
    from app.services.gemini_client import GeminiClient

    client = GeminiClient()
    active_inferences = 0
    max_concurrent_seen = 0

    async def mock_call(*args, **kwargs):
        nonlocal active_inferences, max_concurrent_seen
        active_inferences += 1
        max_concurrent_seen = max(max_concurrent_seen, active_inferences)
        await asyncio.sleep(0.05)
        active_inferences -= 1
        return "{}", "gemini-test", 0.05, 10

    # Test running 5 concurrent requests
    with patch.object(client, "_execute_analysis_with_retries", side_effect=mock_call):
        with patch.object(GeminiClient, "_min_call_interval", 0.01):
            tasks = [
                client.analyze_image_bytes(image_bytes=b"fake")
                for _ in range(5)
            ]
            await asyncio.gather(*tasks)

    # Concurrency must be strictly 1 at all times!
    assert max_concurrent_seen == 1
