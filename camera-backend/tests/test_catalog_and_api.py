"""Unit and integration tests for CatalogService, CacheService, and API endpoints."""

try:
    import pytest
except ImportError:
    class _MockPytest:
        class mark:
            @staticmethod
            def asyncio(fn):
                return fn
    pytest = _MockPytest()
from app.models.camera import CameraDTO, CameraFilterQuery
from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService


@pytest.mark.asyncio
async def test_cache_service_fallback():
    """Tests in-memory fallback mechanism when Redis is not running."""
    cache = CacheService(redis_url="redis://nonexistent:9999/0")
    # Will fail connection and switch to in-memory
    connected = await cache.connect()
    assert connected is False
    assert cache.is_connected() is False

    # Snapshot caching in-memory
    await cache.set_snapshot("cam_123", b"FAKE_JPEG_BYTES", ttl=5.0)
    cached = await cache.get_snapshot("cam_123")
    assert cached == b"FAKE_JPEG_BYTES"

    # Cookies caching in-memory
    await cache.set_session_cookies("hcmc", {".VDMS": "secret_cookie"}, ttl=10.0)
    cookies = await cache.get_session_cookies("hcmc")
    assert cookies == {".VDMS": "secret_cookie"}


@pytest.mark.asyncio
async def test_catalog_service_filters():
    """Tests multi-parameter filtering on Camera catalog."""
    cache = CacheService()
    catalog = CatalogService(cache)

    sample_cams = [
        CameraDTO(
            id="cam_1",
            provider="hcmc",
            city="hcmc",
            name="Ngã tư Hàng Xanh",
            code="CAM_HX_01",
            district="Bình Thạnh",
            latitude=10.8016,
            longitude=106.7118,
            status="UP",
        ),
        CameraDTO(
            id="cam_2",
            provider="hcmc",
            city="hcmc",
            name="Vòng xoay Dân Chủ",
            code="CAM_Q3_01",
            district="Quận 3",
            latitude=10.7781,
            longitude=106.6823,
            status="UP",
        ),
        CameraDTO(
            id="cam_3",
            provider="hcmc",
            city="hcmc",
            name="Cầu Chữ Y",
            code="CAM_Q5_01",
            district="Quận 5",
            latitude=10.7512,
            longitude=106.6811,
            status="DOWN",
        ),
    ]

    for c in sample_cams:
        catalog._cameras_by_id[c.id] = c
    catalog._cameras_list = sample_cams

    # 1. District filter
    res_dist = await catalog.get_cameras(CameraFilterQuery(district="Bình Thạnh"))
    assert res_dist.total == 1
    assert res_dist.items[0].id == "cam_1"

    # 2. Status filter
    res_status = await catalog.get_cameras(CameraFilterQuery(status="DOWN"))
    assert res_status.total == 1
    assert res_status.items[0].id == "cam_3"

    # 3. Keyword filter
    res_kw = await catalog.get_cameras(CameraFilterQuery(keyword="Dân Chủ"))
    assert res_kw.total == 1
    assert res_kw.items[0].id == "cam_2"

    # 4. Bounding box filter (around District 3)
    bbox_str = "10.770,106.670,10.790,106.690"
    res_bbox = await catalog.get_cameras(CameraFilterQuery(bbox=bbox_str))
    assert res_bbox.total == 1
    assert res_bbox.items[0].id == "cam_2"
