"""Integration tests for CameraServiceClient and core backend cameras router."""

import pytest
from app.models.camera import CameraResponse
from app.routers.cameras import _convert_external_camera
from app.services.camera_service_client import CameraServiceClient


def test_convert_external_camera():
    """Tests mapping of camera-backend DTO to FloodWheel CameraResponse model."""
    raw_dto = {
        "id": "662b86c41afb9c00172dd31c",
        "provider": "hcmc",
        "city": "hcmc",
        "name": "Ngã tư Hàng Xanh - Xô Viết Nghệ Tĩnh",
        "code": "CAM_HX_01",
        "district": "Bình Thạnh",
        "latitude": 10.80164,
        "longitude": 106.71182,
        "status": "UP",
        "snapshot_url": "/api/v1/cameras/662b86c41afb9c00172dd31c/snapshot",
    }

    converted: CameraResponse = _convert_external_camera(raw_dto)
    assert converted.id == "662b86c41afb9c00172dd31c"
    assert converted.name == "Ngã tư Hàng Xanh - Xô Viết Nghệ Tĩnh"
    assert converted.status == "ONLINE"
    assert converted.latitude == 10.80164
    assert converted.longitude == 106.71182
    assert converted.location == "Bình Thạnh"


def test_convert_external_camera_down_status():
    """Tests status conversion when camera is DOWN."""
    raw_dto = {
        "id": "cam_down_01",
        "name": "Cầu Bình Triệu",
        "district": "Thủ Đức",
        "status": "DOWN",
    }
    converted: CameraResponse = _convert_external_camera(raw_dto)
    assert converted.status == "OFFLINE"


@pytest.mark.asyncio
async def test_client_fallback_on_unreachable_service():
    """Verifies that CameraServiceClient gracefully generates mock frame when service is offline."""
    client = CameraServiceClient(base_url="http://nonexistent-camera-backend:9999")

    # Snapshot fallback
    frame_bytes, content_type = await client.get_snapshot_bytes(
        camera_id="cam_fallback_01",
        camera_name="Test Fallback Camera",
    )
    assert isinstance(frame_bytes, bytes)
    assert len(frame_bytes) > 500
    assert content_type == "image/jpeg"

    # List cameras fallback (returns None so local DB cameras are used)
    res = await client.list_cameras()
    assert res is None

    await client.close()
