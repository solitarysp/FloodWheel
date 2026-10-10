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
        "name": "Nguyen Huu Canh Corridor (Thu Thiem Bridge - The Manor)",
        "district": "Binh Thanh",
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
        "name": "Vo Van Ngan Incline (Thu Duc Market)",
        "district": "Thu Duc City",
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
        "name": "Quoc Huong Street (Thao Dien)",
        "district": "Thu Duc City",
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
        "name": "Le Loi Boulevard - Ben Thanh Market",
        "district": "District 1",
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
        "name": "TTH 233.1: Nguyen Huu Canh - Ngo Tat To (Thu Thiem 1 Bridge Foot)",
        "location": "Nguyen Huu Canh, Ward 22, Binh Thanh",
        "latitude": 10.7891,
        "longitude": 106.7164,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=63b65ebebfd3d90017eaa3ae&bg=black&w=640&h=360",
        "video_url": "http://camera.thongtingiaothong.vn/s/5822b5ededeb6c0012a2d66a/index.m3u8",
        "zone_id": "zone-nguyen-huu-canh",
        "status": "ONLINE",
    },
    {
        "id": "cam-nhc-02",
        "name": "TTH 40.4: Dien Bien Phu - Nguyen Huu Canh",
        "location": "Dien Bien Phu & Nguyen Huu Canh, Ward 22, Binh Thanh",
        "latitude": 10.7978,
        "longitude": 106.7211,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=5a606dbc8576340017d0662b&bg=black&w=640&h=360",
        "video_url": "http://camera.thongtingiaothong.vn/s/587ee2aeb807da0011e33d52/index.m3u8",
        "zone_id": "zone-nguyen-huu-canh",
        "status": "ONLINE",
    },
    {
        "id": "cam-vvn-01",
        "name": "TTH 32.3: Vo Van Ngan - Thu Duc Junction",
        "location": "Vo Van Ngan & Dang Van Bi Corridor, Thu Duc City",
        "latitude": 10.8493,
        "longitude": 106.7738,
        "camera_angle": "street_level",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=56df8198c062921100c143dd&bg=black&w=640&h=360",
        "video_url": "http://125.234.114.126:11984/api/stream.m3u8?src=N%C3%BAt%20giao%20Th%E1%BB%A7%20%C4%90%E1%BB%A9c%203&mp4",
        "zone_id": "zone-vo-van-ngan",
        "status": "ONLINE",
    },
    {
        "id": "cam-qh-01",
        "name": "TTH 33.3: Vo Nguyen Giap - Thao Dien Incline (Quoc Huong)",
        "location": "Vo Nguyen Giap & Quoc Huong Corridor, Thao Dien, Thu Duc City",
        "latitude": 10.8010,
        "longitude": 106.7383,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=587c782db807da0011e33d3b&bg=black&w=640&h=360",
        "video_url": "http://125.234.114.126:11984/api/stream.m3u8?src=Xa%20L%E1%BB%99%20H%C3%A0%20N%E1%BB%99i%20-%20Th%E1%BA%A3o%20%C4%90i%E1%BB%81n&mp4",
        "zone_id": "zone-quoc-huong",
        "status": "ONLINE",
    },
    {
        "id": "cam-ll-01",
        "name": "TTH 6.1: Vo Van Kiet - Ky Con (Ben Thanh / D1)",
        "location": "Vo Van Kiet & Ky Con, Ben Thanh, District 1",
        "latitude": 10.7655,
        "longitude": 106.7001,
        "camera_angle": "overhead",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=56de42f611f398ec0c481287&bg=black&w=640&h=360",
        "video_url": "http://camera.thongtingiaothong.vn/s/56de42f611f398ec0c481287/index.m3u8",
        "zone_id": "zone-le-loi",
        "status": "ONLINE",
    },
    {
        "id": "cam-tqk-01",
        "name": "TTH 406: Tran Quang Khai - Tran Khac Chan",
        "location": "Tran Quang Khai & Tran Khac Chan, Tan Dinh, District 1",
        "latitude": 10.7919,
        "longitude": 106.6911,
        "camera_angle": "elevated",
        "stream_url": "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=662b86c41afb9c00172dd31c&bg=black&w=640&h=360",
        "video_url": "https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8",
        "zone_id": "zone-le-loi",
        "status": "ONLINE",
    },
]


async def seed_database(session: AsyncSession) -> None:
    """Populates database with initial HCMC zones and cameras if not present, and refreshes camera stream URLs."""
    # 1. Seed Zones First and commit
    try:
        for z_data in SAMPLE_ZONES:
            existing = await session.get(FloodZone, z_data["id"])
            if not existing:
                zone = FloodZone(**z_data, last_updated_at=datetime.now(timezone.utc))
                session.add(zone)
            else:
                existing.name = z_data["name"]
                existing.district = z_data["district"]
                existing.center_lat = z_data["center_lat"]
                existing.center_lng = z_data["center_lng"]
                existing.geometry_geojson = z_data["geometry_geojson"]
        await session.commit()
        logger.info("Flood zones seeded successfully.")
    except Exception as e:
        await session.rollback()
        logger.warning(f"Error seeding flood zones: {e}")

    # 2. Seed and Update Cameras
    try:
        for c_data in SAMPLE_CAMERAS:
            existing = await session.get(Camera, c_data["id"])
            if not existing:
                cam = Camera(**c_data, last_polled_at=datetime.now(timezone.utc))
                session.add(cam)
            else:
                # Refresh existing camera stream URL, video URL, and coordinates to authentic portal parameters
                existing.name = c_data["name"]
                existing.location = c_data["location"]
                existing.latitude = c_data["latitude"]
                existing.longitude = c_data["longitude"]
                existing.stream_url = c_data["stream_url"]
                existing.video_url = c_data.get("video_url")
                existing.camera_angle = c_data["camera_angle"]
                existing.zone_id = c_data["zone_id"]
                existing.status = c_data["status"]
        await session.commit()
        logger.info("Cameras seeded successfully.")
    except Exception as e:
        await session.rollback()
        logger.warning(f"Error seeding cameras: {e}")
