import io
import pytest
from PIL import Image
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.camera_stream_service import CameraStreamService


def test_validate_stream_url_valid():
    is_valid, msg = CameraStreamService.validate_stream_url(
        "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=662b86c41afb9c00172dd31c&bg=black&w=640&h=360"
    )
    assert is_valid is True
    assert msg == "Valid"


def test_validate_stream_url_ssrf_blocked():
    is_valid, msg = CameraStreamService.validate_stream_url("http://127.0.0.1:8000/internal")
    assert is_valid is False
    assert "prohibited" in msg.lower() or "ssrf" in msg.lower()

    is_valid_priv, msg_priv = CameraStreamService.validate_stream_url("http://192.168.1.1/admin")
    assert is_valid_priv is False


def test_validate_stream_url_invalid_scheme():
    is_valid, msg = CameraStreamService.validate_stream_url("ftp://camera.local/feed.mp4")
    assert is_valid is False
    assert "scheme" in msg.lower()


def test_generate_mock_frame():
    frame_bytes = CameraStreamService.generate_mock_frame("cam-test-01", "Test Camera Intersection")
    assert len(frame_bytes) > 500

    # Ensure it's valid JPEG decodable by Pillow
    img = Image.open(io.BytesIO(frame_bytes))
    assert img.format == "JPEG"
    assert img.size == (640, 360)


@pytest.mark.asyncio
async def test_get_snapshot_bytes_fallback_and_caching():
    # Calling with an unreachable or mock URL returns synthetic frame and caches it
    bytes_1, mime_1 = await CameraStreamService.get_snapshot_bytes(
        stream_url="https://mock-unreachable-stream.test/cam.jpg",
        camera_id="cam-cache-test",
        camera_name="Cache Test Camera",
    )
    assert mime_1 == "image/jpeg"
    assert len(bytes_1) > 500

    # Second call should return identical cached bytes
    bytes_2, mime_2 = await CameraStreamService.get_snapshot_bytes(
        stream_url="https://mock-unreachable-stream.test/cam.jpg",
        camera_id="cam-cache-test",
        camera_name="Cache Test Camera",
    )
    assert bytes_1 == bytes_2
    assert mime_1 == mime_2


@pytest.mark.asyncio
async def test_get_camera_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. List cameras
        resp = await client.get("/api/v1/cameras")
        assert resp.status_code == 200
        cameras = resp.json()
        assert len(cameras) >= 5

        # 2. Get specific camera
        first_cam_id = cameras[0]["id"]
        resp_cam = await client.get(f"/api/v1/cameras/{first_cam_id}")
        assert resp_cam.status_code == 200
        assert resp_cam.json()["id"] == first_cam_id

        # 3. Get camera snapshot frame
        resp_snap = await client.get(f"/api/v1/cameras/{first_cam_id}/snapshot")
        assert resp_snap.status_code == 200
        assert "image/" in resp_snap.headers.get("content-type", "")
        assert len(resp_snap.content) > 100

        # 4. Analyze snapshot
        resp_analyze = await client.post(f"/api/v1/cameras/{first_cam_id}/analyze")
        assert resp_analyze.status_code == 200
        data = resp_analyze.json()
        assert data["success"] is True
        assert "reading" in data
        assert "confidence_score" in data["reading"]
