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

            # 2. Run batch analysis across cameras
            from app.services.flood_analysis_service import FloodAnalysisService
            analysis_svc = FloodAnalysisService()
            batch_res = await analysis_svc.analyze_batch(session=session, limit=10)

        return {
            "cycle_timestamp": cycle_start.isoformat(),
            "weather_condition": weather_note,
            "recommended_interval_sec": interval_sec,
            "cameras_polled": batch_res.get("total_analyzed", 0),
            "flooded_count": batch_res.get("flooded_count", 0),
            "max_depth_cm": batch_res.get("max_depth_cm", 0),
            "results_summary": batch_res.get("results", []),
        }
