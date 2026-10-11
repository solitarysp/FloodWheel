"""Flood Analysis & Aggregation Service.

Orchestrates snapshot fetching, Gemini Vision AI inference (VLRDR methodology),
database persistence of flood readings, and multi-camera zone aggregation.
"""

import asyncio
import base64
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.db_models import Camera, FloodReadingDB, FloodZone
from app.models.flood_reading import AnalysisResponse, FloodReading
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

    async def analyze_single_camera(
        self,
        session: AsyncSession,
        camera_id: str,
        image_base64: Optional[str] = None,
        force_refresh: bool = False,
    ) -> AnalysisResponse:
        """Executes flood depth analysis on a camera snapshot and updates zone aggregation."""
        # Smart Analysis Cache Check (Phương án 4: Reuse recent AI analysis within cache TTL)
        cache_minutes = getattr(settings, "FLOOD_ANALYSIS_CACHE_MINUTES", 5)
        if not image_base64 and not force_refresh and cache_minutes > 0:
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
            if cached_reading:
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
                )

        # 1. Resolve camera details
        cam = await CameraRegistry.get_by_id(session, camera_id)
        camera_name = cam.name if cam else camera_id
        camera_location = cam.location if cam else "TP. Hồ Chí Minh"
        camera_lat = cam.latitude if cam else 10.7769
        camera_lng = cam.longitude if cam else 106.7009
        camera_angle = (cam.camera_angle if cam else None) or "elevated"

        # If not present in DB, attempt lookup from camera-backend
        if not cam:
            remote_cam = await self.camera_service_client.get_camera_by_id(camera_id)
            if remote_cam:
                camera_name = remote_cam.get("name") or camera_id
                camera_location = remote_cam.get("district") or remote_cam.get("name") or "TP. Hồ Chí Minh"
                camera_lat = float(remote_cam.get("latitude") or 10.7769)
                camera_lng = float(remote_cam.get("longitude") or 106.7009)

        # Ensure Camera and FloodZone exist in DB
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
            # Pull frame from camera-backend or local stream
            frame_bytes, _ = await self.camera_service_client.get_snapshot_bytes(
                camera_id=camera_id,
                camera_name=cam.name,
            )

        # Check if frame is a default / synthetic fallback frame or error placeholder image
        if not frame_bytes or ImageValidator.is_default_or_invalid(frame_bytes):
            logger.info(
                "Camera %s is returning default/synthetic placeholder frame (%d bytes). Skipping AI scan.",
                camera_id,
                len(frame_bytes) if frame_bytes else 0,
            )
            return AnalysisResponse(
                success=False,
                reading=FloodReading(
                    camera_id=cam.id,
                    flood_detected=False,
                    depth_level=0,
                    depth_estimate_cm_min=0,
                    depth_estimate_cm_max=0,
                    confidence_score=0.0,
                    alert_message="Ảnh camera là ảnh mặc định (chưa có tín hiệu thực tế). Tạm thời bỏ qua quét AI.",
                    reasoning="Default synthetic frame or placeholder error image detected. AI analysis skipped to avoid false readings.",
                    reference_objects_used=[],
                ),
                inference_time_ms=0.0,
                model_used="skipped-default-image",
                tokens_used=0,
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
        )

    async def analyze_batch(
        self,
        session: AsyncSession,
        camera_ids: Optional[List[str]] = None,
        district: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Runs flood analysis on a batch of cameras with concurrency control."""
        targets = []

        if camera_ids:
            # Use specific cameras requested
            targets = camera_ids[:limit]
        else:
            # Fetch candidates from camera-backend or local DB
            remote_cams = await self.camera_service_client.list_cameras(
                district=district,
                limit=limit * 2,
            )
            if remote_cams:
                targets = [c["id"] for c in remote_cams[:limit]]
            else:
                stmt = select(Camera).where(Camera.status != "OFFLINE").limit(limit)
                res = await session.execute(stmt)
                targets = [c.id for c in res.scalars().all()]

        if not targets:
            return {
                "total_analyzed": 0,
                "flooded_count": 0,
                "max_depth_cm": 0,
                "results": [],
            }

        results = []
        # Process strictly one camera at a time to prevent HTTP 429 rate limits
        for cid in targets:
            try:
                async with AsyncSessionLocal() as worker_session:
                    res = await self.analyze_single_camera(worker_session, cid)

                if res.model_used == "skipped-default-image":
                    results.append({
                        "camera_id": cid,
                        "success": True,
                        "skipped": True,
                        "reason": "Ảnh mặc định (chưa có luồng thực tế)",
                        "depth_level": 0,
                        "depth_cm_min": 0,
                        "depth_cm_max": 0,
                        "flood_detected": False,
                        "confidence_score": 0.0,
                        "alert_message": res.reading.alert_message,
                        "inference_time_ms": 0.0,
                    })
                elif res.model_used == "cache-hit":
                    results.append({
                        "camera_id": cid,
                        "success": True,
                        "skipped": False,
                        "cached": True,
                        "depth_level": res.reading.depth_level,
                        "depth_cm_min": res.reading.depth_estimate_cm_min,
                        "depth_cm_max": res.reading.depth_estimate_cm_max,
                        "flood_detected": res.reading.flood_detected,
                        "confidence_score": res.reading.confidence_score,
                        "alert_message": res.reading.alert_message,
                        "inference_time_ms": res.inference_time_ms,
                    })
                    # Minimal delay for cache hits
                    await asyncio.sleep(0.5)
                else:
                    results.append({
                        "camera_id": cid,
                        "success": True,
                        "skipped": False,
                        "cached": False,
                        "depth_level": res.reading.depth_level,
                        "depth_cm_min": res.reading.depth_estimate_cm_min,
                        "depth_cm_max": res.reading.depth_estimate_cm_max,
                        "flood_detected": res.reading.flood_detected,
                        "confidence_score": res.reading.confidence_score,
                        "alert_message": res.reading.alert_message,
                        "inference_time_ms": res.inference_time_ms,
                    })
                    # Polite pacing delay between consecutive AI scans (Phương án 1)
                    scan_delay = float(getattr(settings, "GEMINI_MIN_CALL_INTERVAL_SECONDS", 6.0)) + 1.0
                    await asyncio.sleep(scan_delay)
            except Exception as exc:
                logger.error("Error analyzing camera %s in batch: %s", cid, exc)
                results.append({
                    "camera_id": cid,
                    "success": False,
                    "error": str(exc),
                })

        successful = [r for r in results if r.get("success")]
        flooded_count = sum(1 for r in successful if r.get("flood_detected"))
        max_depth = max([r.get("depth_cm_max", 0) for r in successful] or [0])

        return {
            "total_analyzed": len(successful),
            "flooded_count": flooded_count,
            "max_depth_cm": max_depth,
            "results": results,
        }
