import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.db_models import Camera, FloodReadingDB, FloodZone
from app.services.camera_registry import CameraRegistry
from app.services.flood_reading_parser import FloodReadingParser
from app.services.frame_puller import FramePuller
from app.services.gemini_client import GeminiClient
from app.services.privacy_filter import PrivacyFilter
from app.services.weather_client import WeatherClient
from app.services.zone_aggregator import ZoneAggregator

logger = logging.getLogger(__name__)


class PollingScheduler:
    """Orchestrates scheduled camera frame polling, privacy filtering, AI analysis, and aggregation."""

    def __init__(self):
        self.frame_puller = FramePuller()
        self.gemini_client = GeminiClient()
        self.is_running = False

    async def run_single_poll_cycle(self) -> Dict[str, Any]:
        """Executes one complete polling cycle across all registered cameras."""
        logger.info("Executing scheduled camera polling cycle...")
        cycle_start = datetime.now(timezone.utc)
        results = []

        async with AsyncSessionLocal() as session:
            # 1. Check weather for dynamic rate recommendation
            interval_sec, weather_note = await WeatherClient.get_recommended_polling_interval()

            # 2. Get active cameras
            stmt = select(Camera).where(Camera.status != "OFFLINE")
            cam_res = await session.execute(stmt)
            cameras: List[Camera] = list(cam_res.scalars().all())

            for cam in cameras:
                # Pull frame
                raw_bytes, success = await self.frame_puller.pull_frame(cam.stream_url)
                await CameraRegistry.record_poll_result(session, cam.id, success)

                if not success or not raw_bytes:
                    continue

                # Apply Privacy Filter (license plate & face blur)
                safe_bytes, filter_time_ms = PrivacyFilter.apply_filter(raw_bytes)

                # Send to Gemini VLRDR Vision AI
                raw_text, model, elapsed, tokens = await self.gemini_client.analyze_image_bytes(
                    image_bytes=safe_bytes,
                    camera_angle=cam.camera_angle or "elevated",
                    location_hint=cam.location,
                )

                reading = FloodReadingParser.parse(
                    raw_text=raw_text,
                    camera_id=cam.id,
                )

                # Persist reading to database
                db_reading = FloodReadingDB(
                    camera_id=cam.id,
                    zone_id=cam.zone_id,
                    timestamp=datetime.now(timezone.utc),
                    flood_detected=reading.flood_detected,
                    confidence_score=reading.confidence_score,
                    depth_level=reading.depth_level,
                    depth_estimate_cm_min=reading.depth_estimate_cm_min,
                    depth_estimate_cm_max=reading.depth_estimate_cm_max,
                    reference_objects=json.dumps(reading.reference_objects_used),
                    reasoning=reading.reasoning,
                    alert_message=reading.alert_message,
                )
                session.add(db_reading)
                results.append({
                    "camera_id": cam.id,
                    "depth_level": reading.depth_level,
                    "depth_cm": f"{reading.depth_estimate_cm_min}-{reading.depth_estimate_cm_max}cm",
                    "inference_sec": round(elapsed, 2),
                })

            await session.commit()

            # 3. Aggregate each zone
            zones_stmt = select(FloodZone)
            z_res = await session.execute(zones_stmt)
            zones = list(z_res.scalars().all())

            for zone in zones:
                readings_stmt = (
                    select(FloodReadingDB)
                    .where(FloodReadingDB.zone_id == zone.id)
                    .order_by(FloodReadingDB.timestamp.desc())
                    .limit(10)
                )
                r_res = await session.execute(readings_stmt)
                recent_readings = list(r_res.scalars().all())
                await ZoneAggregator.aggregate_zone(session, zone, recent_readings)

        return {
            "cycle_timestamp": cycle_start.isoformat(),
            "weather_condition": weather_note,
            "recommended_interval_sec": interval_sec,
            "cameras_polled": len(results),
            "results_summary": results,
        }
