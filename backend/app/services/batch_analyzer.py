"""Batch analysis runner with rate limit pacing."""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.db_models import Camera
from app.services.camera_service_client import CameraServiceClient

logger = logging.getLogger("floodwheel.batch_analyzer")


class BatchAnalyzer:
    """Orchestrates multi-camera batch scans with pacing."""

    def __init__(self, single_camera_analyzer, camera_service_client: Optional[CameraServiceClient] = None):
        self._analyze_single_camera = single_camera_analyzer
        self.camera_service_client = camera_service_client or CameraServiceClient()

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
            targets = camera_ids[:limit]
        else:
            remote_cams = await self.camera_service_client.list_cameras(
                district=district,
                has_snapshot=True,
                limit=limit * 2,
            )
            if remote_cams:
                targets = [c["id"] for c in remote_cams[:limit]]
            else:
                from app.services.camera_snapshot_finder import CameraSnapshotFinder
                valid_ids = CameraSnapshotFinder.get_valid_snapshot_camera_ids()
                stmt = select(Camera).where(Camera.status != "OFFLINE")
                res = await session.execute(stmt)
                db_cams = [c.id for c in res.scalars().all()]
                if valid_ids:
                    targets = [cid for cid in db_cams if cid in valid_ids][:limit]
                else:
                    targets = db_cams[:limit]

        if not targets:
            return {
                "total_analyzed": 0,
                "flooded_count": 0,
                "max_depth_cm": 0,
                "results": [],
            }

        results = []
        for cid in targets:
            try:
                async with AsyncSessionLocal() as worker_session:
                    res = await self._analyze_single_camera(worker_session, cid)

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
