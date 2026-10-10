import json
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Camera, FloodZone

logger = logging.getLogger(__name__)

SAMPLE_ZONES = [
    {
        "id": "zone-nguyen-huu-canh",
        "name": "Đoạn đường Nguyễn Hữu Cảnh (Chân cầu Thủ Thiêm - The Manor)",
        "district": "Bình Thạnh",
        "city": "hcmc",
        "center_lat": 10.7938,
        "center_lng": 106.7196,
        "current_depth_level": 3,
        "current_depth_cm_min": 30,
        "current_depth_cm_max": 38,
        "geometry_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[
                [106.7170, 10.7920],
                [106.7220, 10.7930],
                [106.7215, 10.7955],
                [106.7165, 10.7945],
                [106.7170, 10.7920]
            ]]
        })
    },
    {
        "id": "zone-vo-van-ngan",
        "name": "Đoạn dốc Võ Văn Ngân (Chợ Thủ Đức)",
        "district": "TP. Thủ Đức",
        "city": "hcmc",
        "center_lat": 10.8512,
        "center_lng": 106.7580,
        "current_depth_level": 4,
        "current_depth_cm_min": 45,
        "current_depth_cm_max": 60,
        "geometry_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[
                [106.7560, 10.8495],
                [106.7600, 10.8510],
                [106.7595, 10.8530],
                [106.7555, 10.8515],
                [106.7560, 10.8495]
            ]]
        })
    },
    {
        "id": "zone-quoc-huong",
        "name": "Đường Quốc Hương (Thảo Điền)",
        "district": "TP. Thủ Đức",
        "city": "hcmc",
        "center_lat": 10.8062,
        "center_lng": 106.7325,
        "current_depth_level": 2,
        "current_depth_cm_min": 18,
        "current_depth_cm_max": 25,
        "geometry_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[
                [106.7305, 10.8045],
                [106.7345, 10.8060],
                [106.7340, 10.8080],
                [106.7300, 10.8065],
                [106.7305, 10.8045]
            ]]
        })
    },
    {
        "id": "zone-le-loi",
        "name": "Đại lộ Lê Lợi - Chợ Bến Thành",
        "district": "Quận 1",
        "city": "hcmc",
        "center_lat": 10.7725,
        "center_lng": 106.6985,
        "current_depth_level": 0,
        "current_depth_cm_min": 0,
        "current_depth_cm_max": 0,
        "geometry_geojson": json.dumps({
            "type": "Polygon",
            "coordinates": [[
                [106.6965, 10.7710],
                [106.7005, 10.7725],
                [106.7000, 10.7740],
                [106.6960, 10.7725],
                [106.6965, 10.7710]
            ]]
        })
    }
]

SAMPLE_CAMERAS = [
    {
        "id": "cam-nhc-01",
        "name": "CCTV 042: Cầu vượt Nguyễn Hữu Cảnh",
        "location": "Nguyễn Hữu Cảnh, P. 22, Bình Thạnh",
        "latitude": 10.7935,
        "longitude": 106.7192,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-042.jpg",
        "zone_id": "zone-nguyen-huu-canh",
        "status": "ONLINE",
    },
    {
        "id": "cam-nhc-02",
        "name": "CCTV 043: Nguyễn Hữu Cảnh & The Manor",
        "location": "Nguyễn Hữu Cảnh & Ngô Tất Tố, Bình Thạnh",
        "latitude": 10.7942,
        "longitude": 106.7201,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-043.jpg",
        "zone_id": "zone-nguyen-huu-canh",
        "status": "ONLINE",
    },
    {
        "id": "cam-vvn-01",
        "name": "CCTV 108: Ngã ba Võ Văn Ngân & Đặng Văn Bi",
        "location": "Võ Văn Ngân, Trường Thọ, TP. Thủ Đức",
        "latitude": 10.8510,
        "longitude": 106.7582,
        "camera_angle": "street_level",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-108.jpg",
        "zone_id": "zone-vo-van-ngan",
        "status": "ONLINE",
    },
    {
        "id": "cam-qh-01",
        "name": "CCTV 215: Quốc Hương & Xuân Thủy",
        "location": "Quốc Hương, Thảo Điền, TP. Thủ Đức",
        "latitude": 10.8065,
        "longitude": 106.7328,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-215.jpg",
        "zone_id": "zone-quoc-huong",
        "status": "ONLINE",
    },
    {
        "id": "cam-ll-01",
        "name": "CCTV 001: Lê Lợi & Pasteur",
        "location": "Lê Lợi, Bến Nghé, Quận 1",
        "latitude": 10.7728,
        "longitude": 106.6988,
        "camera_angle": "overhead",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-001.jpg",
        "zone_id": "zone-le-loi",
        "status": "ONLINE",
    }
]


async def seed_database(session: AsyncSession) -> None:
    """Populates database with initial HCMC zones and cameras if not present."""
    # Seed Zones
    for z_data in SAMPLE_ZONES:
        existing = await session.get(FloodZone, z_data["id"])
        if not existing:
            zone = FloodZone(**z_data, last_updated_at=datetime.now(timezone.utc))
            session.add(zone)

    # Seed Cameras
    for c_data in SAMPLE_CAMERAS:
        existing = await session.get(Camera, c_data["id"])
        if not existing:
            cam = Camera(**c_data, last_polled_at=datetime.now(timezone.utc))
            session.add(cam)

    await session.commit()
    logger.info("Database seeding completed.")
