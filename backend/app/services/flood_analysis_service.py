"""Flood Analysis & Aggregation Service.

Orchestrates snapshot fetching, Gemini Vision AI inference (VLRDR methodology),
database persistence of flood readings, and multi-camera zone aggregation.
"""

import base64
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import FloodReadingDB, FloodZone
from app.models.flood_reading import AnalysisResponse, FloodReading
from app.services.analysis_cache import AnalysisCache
from app.services.batch_analyzer import BatchAnalyzer
from app.services.camera_registry import CameraRegistry
from app.services.camera_service_client import CameraServiceClient
from app.services.camera_stream_service import CameraStreamService
from app.services.flood_reading_parser import FloodReadingParser
from app.services.gemini_client import GeminiClient
from app.services.image_validator import ImageValidator
from app.services.zone_aggregator import ZoneAggregator

logger = logging.getLogger("floodwheel.analysis_service")


class FloodAnalysisService:
    """Service executing AI flood analysis and updating spatial aggregations."""

    def __init__(self):
        self.gemini_client = GeminiClient()
        self.camera_service_client = CameraServiceClient()
        self._batch_analyzer = BatchAnalyzer(
            single_camera_analyzer=self.analyze_single_camera,
            camera_service_client=self.camera_service_client,
        )

    async def analyze_single_camera(
        self,
        session: AsyncSession,
        camera_id: str,
        image_base64: Optional[str] = None,
        force_refresh: bool = False,
        storage_only: bool = False,
    ) -> AnalysisResponse:
        """Executes flood depth analysis on a camera snapshot and updates zone aggregation."""
        if not image_base64 and not force_refresh:
            cached = await AnalysisCache.get_cached_reading(session, camera_id)
            if cached:
                return cached

        # 1. Resolve camera details
        cam = await CameraRegistry.get_by_id(session, camera_id)
        camera_name = cam.name if cam else camera_id
        camera_location = cam.location if cam else "TP. Hồ Chí Minh"
        camera_lat = cam.latitude if cam else 10.7769
        camera_lng = cam.longitude if cam else 106.7009
        camera_angle = (cam.camera_angle if cam else None) or "elevated"

        if not cam:
            remote_cam = await self.camera_service_client.get_camera_by_id(camera_id)
            if remote_cam:
                camera_name = remote_cam.get("name") or camera_id
                camera_location = remote_cam.get("district") or remote_cam.get("name") or "TP. Hồ Chí Minh"
                camera_lat = float(remote_cam.get("latitude") or 10.7769)
                camera_lng = float(remote_cam.get("longitude") or 106.7009)

        cam = await CameraRegistry.ensure_camera_and_zone(
            session=session,
            camera_id=camera_id,
            name=camera_name,
            location=camera_location,
            latitude=camera_lat,
            longitude=camera_lng,
            camera_angle=camera_angle,
            status="ONLINE",
        )

        # 2. Acquire frame bytes
        frame_bytes = None
        if image_base64:
            try:
                raw_b64 = image_base64
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                frame_bytes = base64.b64decode(raw_b64)
            except Exception as e:
                logger.warning("Failed to decode user-provided base64 frame: %s", e)
                frame_bytes = None

        if not frame_bytes or len(frame_bytes) < 100:
            frame_bytes, _ = await CameraStreamService.get_snapshot_bytes(
                stream_url=cam.stream_url if cam else "",
                camera_id=camera_id,
                camera_name=cam.name if cam else camera_id,
                force_refresh=force_refresh,
                storage_only=storage_only,
            )

        if not frame_bytes or ImageValidator.is_default_or_invalid(frame_bytes):
            logger.info(
                "Camera %s is returning default/synthetic placeholder frame (%d bytes). Skipping AI scan.",
                camera_id,
                len(frame_bytes) if frame_bytes else 0,
            )
            db_reading = FloodReadingDB(
                camera_id=cam.id,
                zone_id=cam.zone_id,
                timestamp=datetime.now(timezone.utc),
                flood_detected=False,
                depth_level=0,
                depth_estimate_cm_min=0,
                depth_estimate_cm_max=0,
                confidence_score=0.0,
                reference_objects="[]",
                reasoning="Ảnh camera hiện đang là ảnh giả lập / placeholder. Bỏ qua phân tích AI để tránh báo sai, đang chờ ảnh thực tế từ camera.",
                alert_message="Đang chờ ảnh từ cam",
            )
            session.add(db_reading)
            try:
                await session.commit()
            except Exception:
                await session.rollback()

            return AnalysisResponse(
                success=False,
                reading=FloodReading(
                    camera_id=cam.id,
                    flood_detected=False,
                    depth_level=0,
                    depth_estimate_cm_min=0,
                    depth_estimate_cm_max=0,
                    confidence_score=0.0,
                    alert_message="Đang chờ ảnh từ cam",
                    reasoning="Ảnh camera hiện đang là ảnh giả lập / placeholder. Bỏ qua phân tích AI để tránh báo sai, đang chờ ảnh thực tế từ camera.",
                    reference_objects_used=[],
                ),
                inference_time_ms=0.0,
                model_used="skipped-default-image",
                tokens_used=0,
                raw_response="SKIPPED_DEFAULT_MOCK_IMAGE",
                prompt_preview="Skipped because frame is default placeholder",
            )

        # 3. Execute Gemini Vision AI inference
        raw_text, model_used, elapsed, tokens = await self.gemini_client.analyze_image_bytes(
            image_bytes=frame_bytes,
            camera_angle=cam.camera_angle or "elevated",
            location_hint=f"{cam.name}, {cam.location}",
        )

        # 4. Parse VLRDR response schema
        reading: FloodReading = FloodReadingParser.parse(
            raw_text=raw_text,
            camera_id=cam.id,
        )

        # 5. Persist reading to database
        db_reading = FloodReadingDB(
            camera_id=cam.id,
            zone_id=cam.zone_id,
            timestamp=datetime.now(timezone.utc),
            flood_detected=reading.flood_detected,
            confidence_score=reading.confidence_score,
            depth_level=reading.depth_level,
            depth_estimate_cm_min=reading.depth_estimate_cm_min,
            depth_estimate_cm_max=reading.depth_estimate_cm_max,
            reference_objects=json.dumps(reading.reference_objects_used or []),
            reasoning=reading.reasoning,
            alert_message=reading.alert_message,
        )
        session.add(db_reading)
        cam.last_polled_at = datetime.now(timezone.utc)
        await session.flush()

        # 6. Re-aggregate zone level status if zone exists
        if cam.zone_id:
            zone = await session.get(FloodZone, cam.zone_id)
            if zone:
                recent_stmt = (
                    select(FloodReadingDB)
                    .where(FloodReadingDB.zone_id == cam.zone_id)
                    .order_by(desc(FloodReadingDB.timestamp))
                    .limit(10)
                )
                r_res = await session.execute(recent_stmt)
                recent_readings = list(r_res.scalars().all())
                await ZoneAggregator.aggregate_zone(session, zone, recent_readings)

        await session.commit()

        return AnalysisResponse(
            success=True,
            reading=reading,
            inference_time_ms=round(elapsed * 1000, 1),
            model_used=model_used,
            tokens_used=tokens,
            raw_response=raw_text,
            prompt_preview=f"Gemini VLRDR prompt (camera={cam.name}, angle={cam.camera_angle or 'elevated'})",
        )

    async def analyze_uploaded_image(
        self,
        image_bytes: bytes,
        camera_angle: str = "elevated",
        location_hint: Optional[str] = None,
        camera_id: str = "demo-upload",
    ) -> AnalysisResponse:
        """Analyzes an uploaded image using Gemini Vision AI."""
        raw_text, model_used, elapsed, tokens = await self.gemini_client.analyze_image_bytes(
            image_bytes=image_bytes,
            camera_angle=camera_angle,
            location_hint=location_hint,
        )
        reading = FloodReadingParser.parse(
            raw_text=raw_text,
            camera_id=camera_id,
        )
        return AnalysisResponse(
            success=True,
            reading=reading,
            inference_time_ms=round(elapsed * 1000, 1),
            model_used=model_used,
            tokens_used=tokens,
            raw_response=raw_text,
            prompt_preview=f"Image upload analysis (angle={camera_angle}, hint={location_hint or 'none'})",
        )

    async def analyze_batch(
        self,
        session: AsyncSession,
        camera_ids: Optional[List[str]] = None,
        district: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Runs flood analysis on a batch of cameras with concurrency control."""
        return await self._batch_analyzer.analyze_batch(
            session=session,
            camera_ids=camera_ids,
            district=district,
            limit=limit,
        )
