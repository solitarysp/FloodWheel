"""Analysis Cache Helper.

Checks recent AI analysis within cache TTL to avoid redundant Gemini Vision calls.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.db_models import FloodReadingDB
from app.models.flood_reading import AnalysisResponse, FloodReading

logger = logging.getLogger("floodwheel.analysis_cache")


class AnalysisCache:
    """Helper for checking cached AI flood readings."""

    @staticmethod
    async def get_cached_reading(
        session: AsyncSession,
        camera_id: str,
    ) -> Optional[AnalysisResponse]:
        cache_minutes = getattr(settings, "FLOOD_ANALYSIS_CACHE_MINUTES", 5)
        if cache_minutes <= 0:
            return None

        cache_cutoff = datetime.now(timezone.utc) - timedelta(minutes=cache_minutes)
        stmt = (
            select(FloodReadingDB)
            .where(
                FloodReadingDB.camera_id == camera_id,
                FloodReadingDB.timestamp >= cache_cutoff,
            )
            .order_by(desc(FloodReadingDB.timestamp))
            .limit(1)
        )
        res = await session.execute(stmt)
        cached_reading = res.scalars().first()
        if not cached_reading:
            return None

        age_sec = (datetime.now(timezone.utc) - cached_reading.timestamp).total_seconds()
        logger.info(
            "Serving cached AI flood reading for camera %s (age: %.1fs, cache TTL: %dm)",
            camera_id,
            age_sec,
            cache_minutes,
        )
        reading = FloodReading(
            camera_id=cached_reading.camera_id,
            timestamp=cached_reading.timestamp,
            flood_detected=cached_reading.flood_detected,
            confidence_score=cached_reading.confidence_score,
            depth_level=cached_reading.depth_level,
            depth_estimate_cm_min=cached_reading.depth_estimate_cm_min,
            depth_estimate_cm_max=cached_reading.depth_estimate_cm_max,
            reference_objects_used=cached_reading.get_reference_objects(),
            reasoning=cached_reading.reasoning,
            alert_message=cached_reading.alert_message,
        )
        return AnalysisResponse(
            success=True,
            reading=reading,
            inference_time_ms=0.0,
            model_used="cache-hit",
            tokens_used=0,
            raw_response="CACHE_HIT",
            prompt_preview=f"Served from cache (age {round(age_sec, 1)}s)",
        )
