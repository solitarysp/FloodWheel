"""Automated Flood Analysis Queue & Background Scheduler.

Runs periodic, automated AI flood analysis over traffic camera feeds and persists
hydrological insights to PostgreSQL and PostGIS spatial aggregations.
Crucial behavior: After the last camera analysis completes in a cycle, waits 30 minutes
before automatically launching the subsequent cycle. Supports manual trigger override
and dynamic camera enqueueing.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional, Set

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from sqlalchemy import select

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.db_models import Camera
from app.services.camera_service_client import CameraServiceClient
from app.services.flood_analysis_service import FloodAnalysisService

logger = logging.getLogger("floodwheel.queue_service")


class FloodAnalysisQueue:
    """Background asynchronous queue and cyclical scheduler for AI camera flood analysis."""

    def __init__(self, interval_minutes: Optional[int] = None):
        interval_m = interval_minutes or getattr(settings, "FLOOD_QUEUE_INTERVAL_MINUTES", 30)
        self.interval_seconds: int = int(interval_m * 60)

        self._queue: asyncio.Queue = asyncio.Queue()
        self._enqueued_ids: Set[str] = set()
        self._wake_event: asyncio.Event = asyncio.Event()

        self._running: bool = False
        self._paused: bool = False
        self._loop_task: Optional[asyncio.Task] = None

        self.status: str = "idle"  # "idle" | "running" | "paused" | "error"
        self.current_cycle_id: int = 0
        self.current_camera_id: Optional[str] = None
        self.current_camera_name: Optional[str] = None

        self.last_cycle_started_at: Optional[datetime] = None
        self.last_cycle_completed_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None

        self.cycle_progress: Dict[str, Any] = {
            "cycle_id": 0,
            "total": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "flooded": 0,
        }
        self.last_cycle_summary: Dict[str, Any] = {}
        self.recent_results: List[Dict[str, Any]] = []

        self.analysis_service = FloodAnalysisService()
        self.camera_service_client = CameraServiceClient()

        # Redis connection
        self._redis: Optional[Any] = None
        self.redis_url = getattr(settings, "REDIS_URL", "redis://redis:6379/0")

    async def connect_redis(self) -> bool:
        """Connects to Redis if available, with graceful in-memory fallback."""
        if aioredis is None:
            logger.info("redis.asyncio not installed; queue running in in-memory state mode.")
            return False

        try:
            self._redis = aioredis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=3.0,
            )
            await self._redis.ping()
            logger.info("FloodAnalysisQueue connected to Redis at %s", self.redis_url)
            return True
        except Exception as exc:
            logger.warning("Redis unavailable for queue service (%s). Operating in-memory.", exc)
            self._redis = None
            return False

    async def _sync_state_to_redis(self):
        """Persists queue status JSON to Redis for cross-service observability."""
        if not self._redis:
            return
        try:
            status_data = self.get_status()
            await self._redis.set(
                "floodwheel:queue:status",
                json.dumps(status_data),
                ex=7200,
            )
        except Exception as exc:
            logger.debug("Failed to sync queue state to Redis: %s", exc)

    async def start(self):
        """Starts the background worker loop task."""
        if self._running:
            logger.warning("FloodAnalysisQueue is already running.")
            return

        self._running = True
        self._paused = False
        await self.connect_redis()

        self._loop_task = asyncio.create_task(self._worker_cycle_loop())
        logger.info(
            "FloodAnalysisQueue started successfully. Cycle interval: %d minutes.",
            self.interval_seconds // 60,
        )

    async def stop(self):
        """Gracefully terminates the background queue worker."""
        if not self._running:
            return

        logger.info("Stopping FloodAnalysisQueue...")
        self._running = False
        self._wake_event.set()

        if self._loop_task and not self._loop_task.done():
            self._loop_task.cancel()
            try:
                await asyncio.wait_for(self._loop_task, timeout=5.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass
            self._redis = None

        self.status = "idle"
        logger.info("FloodAnalysisQueue stopped.")

    async def pause(self) -> Dict[str, Any]:
        """Pauses automated cycles."""
        self._paused = True
        self.status = "paused"
        await self._sync_state_to_redis()
        return self.get_status()

    async def resume(self) -> Dict[str, Any]:
        """Resumes automated cycles."""
        self._paused = False
        if self.status == "paused":
            self.status = "idle"
        self._wake_event.set()
        await self._sync_state_to_redis()
        return self.get_status()

    async def trigger_now(self) -> Dict[str, Any]:
        """Manually forces an immediate analysis cycle, skipping the 30-minute wait."""
        logger.info("Manual trigger requested for FloodAnalysisQueue.")
        self._paused = False
        self._wake_event.set()
        await self._sync_state_to_redis()
        return self.get_status()

    async def enqueue_cameras(self, camera_ids: List[str]) -> int:
        """Enqueues specific camera IDs and wakes the worker if waiting."""
        enqueued_count = 0
        for cid in camera_ids:
            clean_id = str(cid).strip()
            if clean_id and clean_id not in self._enqueued_ids:
                self._enqueued_ids.add(clean_id)
                await self._queue.put({"id": clean_id, "name": clean_id})
                enqueued_count += 1

        if enqueued_count > 0:
            self.cycle_progress["total"] += enqueued_count
            self._wake_event.set()
            await self._sync_state_to_redis()

        return enqueued_count

    async def _discover_all_cameras(self) -> List[Dict[str, Any]]:
        """Discovers all monitored cameras from camera-backend and local PostgreSQL database."""
        cameras: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()

        # 1. Query dedicated camera-backend
        try:
            remote_cams = await self.camera_service_client.list_cameras(limit=500)
            if remote_cams:
                for c in remote_cams:
                    cid = str(c.get("id"))
                    if cid and cid not in seen_ids:
                        seen_ids.add(cid)
                        cameras.append(c)
        except Exception as exc:
            logger.warning("Could not discover cameras from camera-backend: %s", exc)

        # 2. Query local database
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Camera).where(Camera.status != "OFFLINE")
                res = await session.execute(stmt)
                db_cams = list(res.scalars().all())
                for cam in db_cams:
                    if cam.id not in seen_ids:
                        seen_ids.add(cam.id)
                        cameras.append({
                            "id": cam.id,
                            "name": cam.name,
                            "district": cam.location,
                            "latitude": cam.latitude,
                            "longitude": cam.longitude,
                            "camera_angle": cam.camera_angle,
                        })
        except Exception as exc:
            logger.warning("Could not discover cameras from local DB: %s", exc)

        max_cams = getattr(settings, "FLOOD_QUEUE_MAX_CAMERAS_PER_CYCLE", 15)
        if len(cameras) > max_cams:
            logger.info("Capping cycle discovery to %d cameras (out of %d) to conserve quota.", max_cams, len(cameras))
            return cameras[:max_cams]

        return cameras

    async def _process_camera(self, camera_id: str, camera_name: Optional[str] = None) -> Dict[str, Any]:
        """Runs Gemini Vision flood analysis on a single camera with an isolated session."""
        async with AsyncSessionLocal() as session:
            try:
                res = await self.analysis_service.analyze_single_camera(
                    session=session,
                    camera_id=camera_id,
                )
                if res.model_used == "skipped-default-image":
                    item = {
                        "camera_id": camera_id,
                        "camera_name": camera_name or camera_id,
                        "success": True,
                        "skipped": True,
                        "reason": "Đang chờ ảnh từ cam",
                        "flood_detected": False,
                        "depth_level": 0,
                        "depth_cm_min": 0,
                        "depth_cm_max": 0,
                        "alert_message": res.reading.alert_message,
                        "confidence_score": 0.0,
                        "inference_time_ms": 0.0,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    self._record_result(item)
                    return item

                is_cached = (res.model_used == "cache-hit")
                item = {
                    "camera_id": camera_id,
                    "camera_name": camera_name or camera_id,
                    "success": True,
                    "skipped": False,
                    "cached": is_cached,
                    "model_used": res.model_used,
                    "flood_detected": res.reading.flood_detected,
                    "depth_level": res.reading.depth_level,
                    "depth_cm_min": res.reading.depth_estimate_cm_min,
                    "depth_cm_max": res.reading.depth_estimate_cm_max,
                    "alert_message": res.reading.alert_message,
                    "confidence_score": res.reading.confidence_score,
                    "inference_time_ms": res.inference_time_ms,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                self._record_result(item)
                return item
            except Exception as exc:
                logger.error("Error analyzing camera %s in queue: %s", camera_id, exc)
                item = {
                    "camera_id": camera_id,
                    "camera_name": camera_name or camera_id,
                    "success": False,
                    "error": str(exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                self._record_result(item)
                return item

    def _record_result(self, item: Dict[str, Any]):
        """Adds recent analysis result to in-memory sliding window."""
        self.recent_results.insert(0, item)
        if len(self.recent_results) > 30:
            self.recent_results = self.recent_results[:30]

    async def _worker_cycle_loop(self):
        """Main scheduled execution loop.

        Crucial rule: After the last camera finishes in the cycle, wait 30 minutes
        before beginning the next cycle.
        """
        logger.info(
            "Background flood analysis loop started. Post-completion delay: %d minutes.",
            self.interval_seconds // 60,
        )

        # Initial wait (10 seconds) on startup to let services and DB migrations settle
        await asyncio.sleep(10)

        while self._running:
            try:
                if self._paused:
                    await asyncio.sleep(3)
                    continue

                # ----------------- 1. START CYCLE -----------------
                self.status = "running"
                self.current_cycle_id += 1
                cycle_start_time = datetime.now(timezone.utc)
                self.last_cycle_started_at = cycle_start_time
                self.next_run_at = None

                logger.info("=== Starting AI Flood Analysis Cycle #%d ===", self.current_cycle_id)

                # Discover cameras to analyze
                candidates = await self._discover_all_cameras()
                for c in candidates:
                    cid = c.get("id")
                    if cid and cid not in self._enqueued_ids:
                        self._enqueued_ids.add(cid)
                        await self._queue.put(c)

                self.cycle_progress = {
                    "cycle_id": self.current_cycle_id,
                    "total": self._queue.qsize(),
                    "processed": 0,
                    "success": 0,
                    "skipped": 0,
                    "failed": 0,
                    "flooded": 0,
                }
                await self._sync_state_to_redis()

                # ----------------- 2. DRAIN QUEUE -----------------
                cycle_results = []
                while not self._queue.empty() and self._running and not self._paused:
                    item = await self._queue.get()
                    cam_id = item.get("id") if isinstance(item, dict) else str(item)
                    cam_name = item.get("name") if isinstance(item, dict) else cam_id

                    self.current_camera_id = cam_id
                    self.current_camera_name = cam_name
                    await self._sync_state_to_redis()

                    # Analyze single camera
                    res = await self._process_camera(camera_id=cam_id, camera_name=cam_name)
                    cycle_results.append(res)

                    if res.get("skipped"):
                        self.cycle_progress["skipped"] += 1
                    elif res.get("success"):
                        self.cycle_progress["success"] += 1
                        if res.get("flood_detected"):
                            self.cycle_progress["flooded"] += 1
                    else:
                        self.cycle_progress["failed"] += 1

                    self.cycle_progress["processed"] += 1
                    self._enqueued_ids.discard(cam_id)
                    self._queue.task_done()
                    await self._sync_state_to_redis()

                    # Polite rate throttle:
                    # 0.3s for skipped default frames, 0.5s for cache hits, safe pacing (>= 7.0s) after real AI scans
                    if res.get("skipped"):
                        await asyncio.sleep(0.3)
                    elif res.get("cached"):
                        await asyncio.sleep(0.5)
                    else:
                        delay = float(getattr(settings, "GEMINI_MIN_CALL_INTERVAL_SECONDS", 6.0)) + 1.0
                        await asyncio.sleep(delay)

                # ----------------- 3. CYCLE FINISHED -----------------
                # Sau lần chạy cuối cùng: cập nhật thời gian hoàn thành
                cycle_end_time = datetime.now(timezone.utc)
                self.last_cycle_completed_at = cycle_end_time
                self.current_camera_id = None
                self.current_camera_name = None
                self.status = "idle"

                successful_count = self.cycle_progress["success"]
                skipped_count = self.cycle_progress["skipped"]
                flooded_count = sum(1 for r in cycle_results if r.get("flood_detected"))
                max_depth = max([r.get("depth_cm_max", 0) for r in cycle_results if r.get("success") and not r.get("skipped")] or [0])
                duration_sec = round((cycle_end_time - cycle_start_time).total_seconds(), 1)

                self.last_cycle_summary = {
                    "cycle_id": self.current_cycle_id,
                    "started_at": cycle_start_time.isoformat(),
                    "completed_at": cycle_end_time.isoformat(),
                    "duration_seconds": duration_sec,
                    "total_cameras": len(cycle_results),
                    "successful": successful_count,
                    "skipped": skipped_count,
                    "failed": self.cycle_progress["failed"],
                    "flooded_count": flooded_count,
                    "max_depth_cm": max_depth,
                }

                # Next run is scheduled exactly 30 minutes after the completion of the last run!
                self.next_run_at = cycle_end_time + timedelta(seconds=self.interval_seconds)

                logger.info(
                    "=== Cycle #%d Completed in %.1fs: %d cameras (%d flooded, max %dcm). "
                    "Next cycle scheduled in %d minutes at %s ===",
                    self.current_cycle_id,
                    duration_sec,
                    len(cycle_results),
                    flooded_count,
                    max_depth,
                    self.interval_seconds // 60,
                    self.next_run_at.isoformat(),
                )
                await self._sync_state_to_redis()

                # ----------------- 4. SLEEP 30 MINUTES -----------------
                # Chờ 30 phút sau lần chạy cuối cùng, có thể thức dậy sớm nếu người dùng ấn chạy ngay
                self._wake_event.clear()
                try:
                    await asyncio.wait_for(self._wake_event.wait(), timeout=float(self.interval_seconds))
                    logger.info("Cycle timer woken up early by manual trigger!")
                except asyncio.TimeoutError:
                    logger.info("30 minutes elapsed since last run. Starting next scheduled cycle.")

            except asyncio.CancelledError:
                logger.info("Flood queue worker loop cancelled.")
                break
            except Exception as loop_exc:
                logger.exception("Unexpected error in flood queue worker loop: %s", loop_exc)
                self.status = "error"
                await asyncio.sleep(30)

    def get_status(self) -> Dict[str, Any]:
        """Provides snapshot of the queue status, countdown, and progress."""
        remaining_sec = 0
        if self.next_run_at and self.status == "idle":
            rem = (self.next_run_at - datetime.now(timezone.utc)).total_seconds()
            remaining_sec = max(0, int(rem))

        return {
            "is_running": self._running,
            "status": self.status,
            "is_processing": self.status == "running",
            "is_paused": self._paused,
            "interval_seconds": self.interval_seconds,
            "interval_minutes": round(self.interval_seconds / 60, 1),
            "current_camera_id": self.current_camera_id,
            "current_camera_name": self.current_camera_name,
            "queue_length": self._queue.qsize(),
            "current_cycle_id": self.current_cycle_id,
            "cycle_progress": self.cycle_progress,
            "last_cycle_started_at": self.last_cycle_started_at.isoformat() if self.last_cycle_started_at else None,
            "last_cycle_completed_at": self.last_cycle_completed_at.isoformat() if self.last_cycle_completed_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "next_run_in_seconds": remaining_sec,
            "last_cycle_summary": self.last_cycle_summary,
            "recent_results": self.recent_results[:10],
        }


# Singleton instance for application-wide use
flood_queue_service = FloodAnalysisQueue()
