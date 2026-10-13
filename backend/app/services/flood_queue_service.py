"""Automated Flood Analysis Queue & Background Scheduler (AI Queue Monitor).

Central queue orchestrator for ALL AI calls in FloodWheel (Gemini Vision VLRDR).
Routes scheduled cycles, single-camera analyses, batch scans, and uploaded demo images
through a single managed queue with priority ordering, concurrency pacing, and persistent
audit logging in PostgreSQL (ai_queue_tasks).
"""

import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from sqlalchemy import delete, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.db_models import AIQueueTaskDB, Camera, FloodReadingDB, FloodZone
from app.models.flood_reading import AnalysisResponse, FloodReading
from app.services.camera_service_client import CameraServiceClient
from app.services.flood_analysis_service import FloodAnalysisService

logger = logging.getLogger("floodwheel.queue_service")


class QueueItem:
    """Internal task representation held in the priority queue."""

    def __init__(
        self,
        task_id: str,
        task_type: str,
        source: str,
        priority: int,
        params: Dict[str, Any],
        camera_id: Optional[str] = None,
        camera_name: Optional[str] = None,
        cycle_id: Optional[int] = None,
    ):
        self.task_id = task_id
        self.task_type = task_type  # "cycle_camera", "single_camera", "batch_camera", "image_upload"
        self.source = source        # "automated_scheduler", "camera_grid", "admin_dashboard", "demo_upload", "api"
        self.priority = priority    # 1=highest (user on-demand), 5=batch, 10=background cycle
        self.params = params
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.cycle_id = cycle_id
        self.created_at = datetime.now(timezone.utc)
        self.future: Optional[asyncio.Future] = None


class FloodAnalysisQueue:
    """Background asynchronous queue and cyclical scheduler for AI flood analysis."""

    def __init__(self, interval_minutes: Optional[int] = None):
        interval_m = interval_minutes or getattr(settings, "FLOOD_QUEUE_INTERVAL_MINUTES", 30)
        self.interval_seconds: int = int(interval_m * 60)
        self.max_cameras_per_cycle: int = getattr(settings, "FLOOD_QUEUE_MAX_CAMERAS_PER_CYCLE", 15)

        # Priority queue: stores tuples (priority, sequence_number, QueueItem)
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._seq_counter: int = 0
        self._enqueued_ids: Set[str] = set()
        self._wake_event: asyncio.Event = asyncio.Event()

        self._running: bool = False
        self._paused: bool = False
        self._loop_task: Optional[asyncio.Task] = None

        self.status: str = "idle"  # "idle" | "running" | "paused" | "error"
        self.current_cycle_id: int = 0
        self.current_camera_id: Optional[str] = None
        self.current_camera_name: Optional[str] = None
        self.current_task_type: Optional[str] = None

        self.last_cycle_started_at: Optional[datetime] = None
        self.last_cycle_completed_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None

        self.cycle_progress: Dict[str, Any] = {
            "cycle_id": 0,
            "total": 0,
            "processed": 0,
            "success": 0,
            "skipped": 0,
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
        """Manually forces an immediate analysis cycle across cameras."""
        logger.info("Manual trigger requested for FloodAnalysisQueue.")
        if not self._running or self._loop_task is None or self._loop_task.done():
            logger.info("Worker loop is not running. Auto-starting FloodAnalysisQueue worker...")
            await self.start()

        self._paused = False
        # Set next_run_at to past so the worker immediately starts the cycle
        self.next_run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self._wake_event.set()
        await self._sync_state_to_redis()
        return self.get_status()

    # ================= SUBMIT TASK (ALL AI CALLS ENTER HERE) =================

    async def submit_task(
        self,
        task_type: str,
        source: str,
        params: Dict[str, Any],
        priority: int = 1,
        camera_id: Optional[str] = None,
        camera_name: Optional[str] = None,
        cycle_id: Optional[int] = None,
        wait_result: bool = False,
        timeout: float = 60.0,
    ) -> Any:
        """Enqueues any AI request into the managed queue and records it into database."""
        # Ensure worker is alive
        if not self._running or self._loop_task is None or self._loop_task.done():
            await self.start()

        task_id = f"task_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc)

        cid = str(camera_id).strip() if camera_id else None
        cname = camera_name or cid

        # Snapshot URL reference
        snapshot_url = None
        if cid:
            snapshot_url = f"/api/v1/cameras/{cid}/snapshot"

        # 1. Persist QUEUED record into PostgreSQL
        try:
            async with AsyncSessionLocal() as session:
                task_db = AIQueueTaskDB(
                    id=task_id,
                    task_type=task_type,
                    source=source,
                    status="QUEUED",
                    camera_id=cid,
                    camera_name=cname,
                    location_hint=params.get("location_hint"),
                    camera_angle=params.get("camera_angle", "elevated"),
                    cycle_id=cycle_id,
                    created_at=created_at,
                    snapshot_url=snapshot_url,
                )
                session.add(task_db)
                await session.commit()
        except Exception as db_err:
            logger.warning("Could not persist initial task record %s to DB: %s", task_id, db_err)

        # 2. Build QueueItem
        item = QueueItem(
            task_id=task_id,
            task_type=task_type,
            source=source,
            priority=priority,
            params=params,
            camera_id=cid,
            camera_name=cname,
            cycle_id=cycle_id,
        )

        loop = asyncio.get_running_loop()
        if wait_result:
            item.future = loop.create_future()

        # 3. Add to PriorityQueue
        self._seq_counter += 1
        await self._queue.put((priority, self._seq_counter, item))

        if cycle_id and cycle_id == self.current_cycle_id:
            self.cycle_progress["total"] += 1

        # 4. Wake worker
        self._wake_event.set()
        await self._sync_state_to_redis()

        logger.info(
            "Enqueued AI task [%s] type=%s source=%s priority=%d (queue size=%d)",
            task_id,
            task_type,
            source,
            priority,
            self._queue.qsize(),
        )

        if wait_result and item.future:
            try:
                return await asyncio.wait_for(item.future, timeout=timeout)
            except asyncio.TimeoutError:
                logger.error("AI task [%s] timed out after %.1fs", task_id, timeout)
                raise TimeoutError(f"AI task {task_id} timed out waiting in queue.")

        return task_id

    async def enqueue_cameras(self, camera_ids: List[str]) -> int:
        """Enqueues camera IDs into queue with deduplication and priority 5."""
        enqueued_count = 0
        for cid in camera_ids:
            clean_id = str(cid).strip()
            if clean_id and clean_id not in self._enqueued_ids:
                self._enqueued_ids.add(clean_id)
                await self.submit_task(
                    task_type="batch_camera",
                    source="admin_dashboard",
                    params={"force_refresh": True},
                    priority=5,
                    camera_id=clean_id,
                    camera_name=clean_id,
                    wait_result=False,
                )
                enqueued_count += 1

        return enqueued_count

    # ================= WORKER CYCLE & EXECUTION LOOP =================

    async def _worker_cycle_loop(self):
        """Continuous background execution loop.

        Picks tasks from PriorityQueue first; when empty, checks if scheduled 30m cycle
        is due. After all cycle tasks drain, schedules next cycle strictly in 30 minutes.
        """
        logger.info("AI Queue worker started. Monitoring priority tasks and cycle scheduler.")
        await asyncio.sleep(3)

        while self._running:
            try:
                # ----------------- 1. PROCESS PENDING QUEUE TASKS -----------------
                if not self._queue.empty():
                    _, _, item = await self._queue.get()
                    try:
                        await self._execute_task(item)
                    finally:
                        if item.camera_id:
                            self._enqueued_ids.discard(item.camera_id)
                        self._queue.task_done()
                        await self._sync_state_to_redis()
                    continue

                # ----------------- 2. CHECK SCHEDULED CYCLES -----------------
                now = datetime.now(timezone.utc)
                should_run_cycle = False

                if not self._paused:
                    if self.next_run_at is None:
                        # Initial cycle on boot
                        should_run_cycle = True
                    elif now >= self.next_run_at:
                        should_run_cycle = True

                if should_run_cycle:
                    await self._launch_scheduled_cycle()
                    continue

                # ----------------- 3. IDLE WAIT -----------------
                self.status = "idle"
                self.current_camera_id = None
                self.current_camera_name = None
                self.current_task_type = None
                await self._sync_state_to_redis()

                # Sleep until next scheduled run or woken by incoming task
                sleep_sec = float(self.interval_seconds)
                if self.next_run_at:
                    rem = (self.next_run_at - datetime.now(timezone.utc)).total_seconds()
                    sleep_sec = max(1.0, min(float(self.interval_seconds), rem))

                self._wake_event.clear()
                try:
                    await asyncio.wait_for(self._wake_event.wait(), timeout=sleep_sec)
                except asyncio.TimeoutError:
                    pass

            except asyncio.CancelledError:
                logger.info("Flood queue worker loop cancelled.")
                break
            except Exception as loop_exc:
                logger.exception("Unexpected error in flood queue worker loop: %s", loop_exc)
                self.status = "error"
                await asyncio.sleep(5)
                self.status = "idle"

    async def _launch_scheduled_cycle(self):
        """Starts a new automated 30-minute city-wide camera inspection cycle."""
        self.status = "running"
        self.current_cycle_id += 1
        cycle_start_time = datetime.now(timezone.utc)
        self.last_cycle_started_at = cycle_start_time
        self.next_run_at = None

        logger.info("=== Starting AI Flood Analysis Cycle #%d ===", self.current_cycle_id)

        candidates = await self._discover_all_cameras()
        self.cycle_progress = {
            "cycle_id": self.current_cycle_id,
            "total": len(candidates),
            "processed": 0,
            "success": 0,
            "skipped": 0,
            "failed": 0,
            "flooded": 0,
        }

        # Submit all candidates to priority queue (priority=10 background)
        for c in candidates:
            cid = c.get("id")
            cname = c.get("name") or cid
            if cid and cid not in self._enqueued_ids:
                self._enqueued_ids.add(cid)
                # Direct queue put to avoid DB overhead during bulk enqueue
                self._seq_counter += 1
                task_id = f"task_{uuid.uuid4().hex[:12]}"

                # DB queued record
                try:
                    async with AsyncSessionLocal() as session:
                        task_db = AIQueueTaskDB(
                            id=task_id,
                            task_type="cycle_camera",
                            source="automated_scheduler",
                            status="QUEUED",
                            camera_id=cid,
                            camera_name=cname,
                            location_hint=c.get("district"),
                            camera_angle=c.get("camera_angle", "elevated"),
                            cycle_id=self.current_cycle_id,
                            created_at=cycle_start_time,
                            snapshot_url=f"/api/v1/cameras/{cid}/snapshot",
                        )
                        session.add(task_db)
                        await session.commit()
                except Exception as db_e:
                    logger.debug("Failed saving cycle task %s: %s", task_id, db_e)

                item = QueueItem(
                    task_id=task_id,
                    task_type="cycle_camera",
                    source="automated_scheduler",
                    priority=10,
                    params={"force_refresh": False},
                    camera_id=cid,
                    camera_name=cname,
                    cycle_id=self.current_cycle_id,
                )
                await self._queue.put((10, self._seq_counter, item))

        await self._sync_state_to_redis()

    async def _execute_task(self, item: QueueItem):
        """Executes a single queue task, tracks timing, updates DB and resolves futures."""
        started_at = datetime.now(timezone.utc)
        queue_wait_ms = round((started_at - item.created_at).total_seconds() * 1000, 1)

        self.status = "running"
        self.current_camera_id = item.camera_id
        self.current_camera_name = item.camera_name or item.camera_id
        self.current_task_type = item.task_type

        # Update DB to PROCESSING
        try:
            async with AsyncSessionLocal() as session:
                task_row = await session.get(AIQueueTaskDB, item.task_id)
                if task_row:
                    task_row.status = "PROCESSING"
                    task_row.started_at = started_at
                    task_row.queue_wait_ms = queue_wait_ms
                    await session.commit()
        except Exception as db_err:
            logger.debug("Could not update task %s to PROCESSING: %s", item.task_id, db_err)

        await self._sync_state_to_redis()

        res: Optional[AnalysisResponse] = None
        error_msg: Optional[str] = None

        try:
            # 1. Execute task based on task_type
            if item.task_type == "image_upload":
                img_bytes = item.params.get("image_bytes")
                c_angle = item.params.get("camera_angle", "elevated")
                loc_hint = item.params.get("location_hint") or item.params.get("filename")
                res = await self.analysis_service.analyze_uploaded_image(
                    image_bytes=img_bytes,
                    camera_angle=c_angle,
                    location_hint=loc_hint,
                    camera_id=item.camera_id or "demo-upload",
                )
            else:
                # Camera task (single_camera, cycle_camera, batch_camera)
                image_b64 = item.params.get("image_base64")
                force_ref = item.params.get("force_refresh", False)
                async with AsyncSessionLocal() as session:
                    res = await self.analysis_service.analyze_single_camera(
                        session=session,
                        camera_id=item.camera_id,
                        image_base64=image_b64,
                        force_refresh=force_ref,
                    )

            # Attach task_id to response
            if res:
                res.task_id = item.task_id

        except Exception as exc:
            logger.error("Error executing AI queue task %s: %s", item.task_id, exc)
            error_msg = str(exc)

        completed_at = datetime.now(timezone.utc)
        duration_ms = round((completed_at - started_at).total_seconds() * 1000, 1)

        # 2. Determine completion status
        if error_msg:
            status_str = "FAILED"
        elif res and res.model_used == "skipped-default-image":
            status_str = "SKIPPED"
        else:
            status_str = "COMPLETED"

        # 3. Update DB record with all results and audit metrics
        try:
            async with AsyncSessionLocal() as session:
                task_row = await session.get(AIQueueTaskDB, item.task_id)
                if task_row:
                    task_row.status = status_str
                    task_row.completed_at = completed_at
                    task_row.duration_ms = duration_ms
                    task_row.error_message = error_msg

                    if res:
                        task_row.model_used = res.model_used
                        task_row.tokens_used = res.tokens_used
                        task_row.inference_time_ms = res.inference_time_ms
                        task_row.raw_response = getattr(res, "raw_response", None)
                        task_row.prompt_preview = getattr(res, "prompt_preview", None)

                        if res.reading:
                            task_row.flood_detected = res.reading.flood_detected
                            task_row.depth_level = res.reading.depth_level
                            task_row.depth_estimate_cm_min = res.reading.depth_estimate_cm_min
                            task_row.depth_estimate_cm_max = res.reading.depth_estimate_cm_max
                            task_row.confidence_score = res.reading.confidence_score
                            task_row.alert_message = res.reading.alert_message
                            task_row.reasoning = res.reading.reasoning
                            task_row.reference_objects = json.dumps(res.reading.reference_objects_used or [])

                    await session.commit()
        except Exception as db_up_err:
            logger.warning("Could not persist completed task %s to DB: %s", item.task_id, db_up_err)

        # 4. Record result to in-memory sliding window
        recent_entry = {
            "task_id": item.task_id,
            "task_type": item.task_type,
            "source": item.source,
            "camera_id": item.camera_id,
            "camera_name": item.camera_name or item.camera_id,
            "success": status_str != "FAILED",
            "skipped": status_str == "SKIPPED",
            "cached": res.model_used == "cache-hit" if res else False,
            "status": status_str,
            "depth_level": res.reading.depth_level if (res and res.reading) else 0,
            "depth_cm_min": res.reading.depth_estimate_cm_min if (res and res.reading) else 0,
            "depth_cm_max": res.reading.depth_estimate_cm_max if (res and res.reading) else 0,
            "flood_detected": res.reading.flood_detected if (res and res.reading) else False,
            "alert_message": res.reading.alert_message if (res and res.reading) else (error_msg or "Thất bại"),
            "model_used": res.model_used if res else "error",
            "tokens_used": res.tokens_used if res else 0,
            "inference_time_ms": res.inference_time_ms if res else 0.0,
            "queue_wait_ms": queue_wait_ms,
            "duration_ms": duration_ms,
            "timestamp": completed_at.isoformat(),
        }
        self._record_result(recent_entry)

        # 5. Update cycle metrics if task belongs to current cycle
        if item.cycle_id and item.cycle_id == self.current_cycle_id:
            self.cycle_progress["processed"] += 1
            if status_str == "COMPLETED":
                self.cycle_progress["success"] += 1
                if res and res.reading and res.reading.flood_detected:
                    self.cycle_progress["flooded"] += 1
            elif status_str == "SKIPPED":
                self.cycle_progress["skipped"] += 1
            else:
                self.cycle_progress["failed"] += 1

            # Check if cycle finished (all items in this cycle processed)
            if self.cycle_progress["processed"] >= self.cycle_progress["total"]:
                self._finish_cycle(completed_at)

        # 6. Resolve future for synchronous callers
        if item.future and not item.future.done():
            if error_msg:
                item.future.set_exception(Exception(error_msg))
            else:
                item.future.set_result(res)

        # Cooperative pacing between Gemini calls
        if status_str == "COMPLETED" and res and res.model_used not in ("cache-hit", "skipped-default-image"):
            await asyncio.sleep(0.5)
        else:
            await asyncio.sleep(0.05)

    def _finish_cycle(self, cycle_end_time: datetime):
        """Finalizes cycle metrics, logs summary, and schedules next cycle in 30 minutes."""
        cycle_start_time = self.last_cycle_started_at or cycle_end_time
        self.last_cycle_completed_at = cycle_end_time
        duration_sec = round((cycle_end_time - cycle_start_time).total_seconds(), 1)

        self.last_cycle_summary = {
            "cycle_id": self.current_cycle_id,
            "started_at": cycle_start_time.isoformat(),
            "completed_at": cycle_end_time.isoformat(),
            "duration_seconds": duration_sec,
            "total_cameras": self.cycle_progress["total"],
            "successful": self.cycle_progress["success"],
            "skipped": self.cycle_progress["skipped"],
            "failed": self.cycle_progress["failed"],
            "flooded_count": self.cycle_progress["flooded"],
            "max_depth_cm": max([r.get("depth_cm_max", 0) for r in self.recent_results if r.get("cycle_id") == self.current_cycle_id] or [0]),
        }

        # Next run is scheduled exactly 30 minutes after completion of the cycle!
        self.next_run_at = cycle_end_time + timedelta(seconds=self.interval_seconds)

        logger.info(
            "=== Cycle #%d Completed in %.1fs: %d cameras (%d flooded). "
            "Next cycle scheduled in %d minutes at %s ===",
            self.current_cycle_id,
            duration_sec,
            self.cycle_progress["total"],
            self.cycle_progress["flooded"],
            self.interval_seconds // 60,
            self.next_run_at.isoformat(),
        )

    # ================= CAMERA DISCOVERY (FAIR ROTATION) =================

    async def _discover_all_cameras(self) -> List[Dict[str, Any]]:
        """Discovers candidate cameras with fair rotation based on least-recently-polled order."""
        cameras: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        db_cams_map: Dict[str, Dict[str, Any]] = {}

        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Camera).where(Camera.status != "OFFLINE")
                res = await session.execute(stmt)
                db_cams = list(res.scalars().all())
                for cam in db_cams:
                    cid = str(cam.id).strip()
                    if cid:
                        db_cams_map[cid] = {
                            "id": cid,
                            "name": cam.name or cid,
                            "district": cam.location or "TP. Hồ Chí Minh",
                            "latitude": cam.latitude,
                            "longitude": cam.longitude,
                            "camera_angle": cam.camera_angle or "elevated",
                            "last_polled_at": cam.last_polled_at,
                            "status": cam.status,
                        }
        except Exception as exc:
            logger.warning("Could not query cameras from local DB: %s", exc)

        try:
            remote_cams = await self.camera_service_client.list_cameras(limit=500)
            if remote_cams:
                for c in remote_cams:
                    cid = str(c.get("id", "")).strip()
                    if not cid:
                        continue
                    if cid in db_cams_map:
                        if cid not in seen_ids:
                            seen_ids.add(cid)
                            cameras.append(db_cams_map[cid])
                    else:
                        if cid not in seen_ids:
                            seen_ids.add(cid)
                            cameras.append({
                                "id": cid,
                                "name": c.get("name") or cid,
                                "district": c.get("district") or c.get("name") or "TP. Hồ Chí Minh",
                                "latitude": c.get("latitude") or 10.7769,
                                "longitude": c.get("longitude") or 106.7009,
                                "camera_angle": c.get("camera_angle") or "elevated",
                                "last_polled_at": None,
                                "status": "ONLINE",
                            })
        except Exception as exc:
            logger.warning("Could not discover cameras from camera-backend: %s", exc)

        for cid, cam_dict in db_cams_map.items():
            if cid not in seen_ids:
                seen_ids.add(cid)
                cameras.append(cam_dict)

        def _sort_key(c: Dict[str, Any]):
            ts = c.get("last_polled_at")
            if ts is None:
                return (0, datetime.min.replace(tzinfo=timezone.utc))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return (1, ts)

        cameras.sort(key=_sort_key)
        return cameras[: self.max_cameras_per_cycle]

    # ================= IN-MEMORY SLIDING WINDOW =================

    def _record_result(self, item: Dict[str, Any]):
        """Adds recent analysis result to in-memory sliding window."""
        self.recent_results.insert(0, item)
        if len(self.recent_results) > 50:
            self.recent_results = self.recent_results[:50]

    def remove_recent_result(self, camera_id: str) -> int:
        """Removes recent results matching camera_id."""
        before = len(self.recent_results)
        self.recent_results = [r for r in self.recent_results if r.get("camera_id") != camera_id]
        return before - len(self.recent_results)

    def clear_recent_results(self) -> int:
        """Clears in-memory recent scan results."""
        count = len(self.recent_results)
        self.recent_results = []
        return count

    # ================= DATABASE HISTORY AUDIT QUERYING =================

    @staticmethod
    async def get_history(
        session: AsyncSession,
        page: int = 1,
        page_size: int = 15,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Queries persistent AI task history with filtering, pagination, and statistical rollups."""
        filters = []
        if status and status.upper() != "ALL":
            if status.upper() == "FLOODED":
                filters.append(AIQueueTaskDB.flood_detected == True)
            else:
                filters.append(AIQueueTaskDB.status == status.upper())

        if task_type and task_type.lower() != "all":
            filters.append(AIQueueTaskDB.task_type == task_type)

        if search and search.strip():
            s = f"%{search.strip()}%"
            filters.append(
                or_(
                    AIQueueTaskDB.camera_name.ilike(s),
                    AIQueueTaskDB.camera_id.ilike(s),
                    AIQueueTaskDB.id.ilike(s),
                    AIQueueTaskDB.alert_message.ilike(s),
                )
            )

        # Total matching
        count_stmt = select(func.count(AIQueueTaskDB.id))
        if filters:
            count_stmt = count_stmt.where(*filters)
        total_count = (await session.execute(count_stmt)).scalar() or 0

        # Items paginated
        stmt = (
            select(AIQueueTaskDB)
            .order_by(desc(AIQueueTaskDB.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        if filters:
            stmt = stmt.where(*filters)
        res = await session.execute(stmt)
        rows = list(res.scalars().all())

        # Global statistics
        total_stmt = select(func.count(AIQueueTaskDB.id))
        completed_stmt = select(func.count(AIQueueTaskDB.id)).where(AIQueueTaskDB.status == "COMPLETED")
        flooded_stmt = select(func.count(AIQueueTaskDB.id)).where(AIQueueTaskDB.flood_detected == True)
        failed_stmt = select(func.count(AIQueueTaskDB.id)).where(AIQueueTaskDB.status == "FAILED")
        skipped_stmt = select(func.count(AIQueueTaskDB.id)).where(AIQueueTaskDB.status == "SKIPPED")
        avg_inf_stmt = select(func.avg(AIQueueTaskDB.inference_time_ms)).where(AIQueueTaskDB.status == "COMPLETED")

        total_all = (await session.execute(total_stmt)).scalar() or 0
        total_comp = (await session.execute(completed_stmt)).scalar() or 0
        total_flood = (await session.execute(flooded_stmt)).scalar() or 0
        total_fail = (await session.execute(failed_stmt)).scalar() or 0
        total_skip = (await session.execute(skipped_stmt)).scalar() or 0
        avg_inf = (await session.execute(avg_inf_stmt)).scalar() or 0.0

        items = []
        for r in rows:
            items.append({
                "id": r.id,
                "task_type": r.task_type,
                "source": r.source,
                "status": r.status,
                "camera_id": r.camera_id,
                "camera_name": r.camera_name,
                "cycle_id": r.cycle_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "duration_ms": r.duration_ms,
                "queue_wait_ms": r.queue_wait_ms,
                "inference_time_ms": r.inference_time_ms,
                "model_used": r.model_used,
                "tokens_used": r.tokens_used,
                "flood_detected": r.flood_detected,
                "depth_level": r.depth_level,
                "depth_estimate_cm_min": r.depth_estimate_cm_min,
                "depth_estimate_cm_max": r.depth_estimate_cm_max,
                "confidence_score": r.confidence_score,
                "alert_message": r.alert_message,
                "error_message": r.error_message,
                "snapshot_url": r.snapshot_url,
            })

        total_pages = max(1, (total_count + page_size - 1) // page_size)

        return {
            "items": items,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "stats": {
                "total_calls": total_all,
                "completed_count": total_comp,
                "flooded_count": total_flood,
                "failed_count": total_fail,
                "skipped_count": total_skip,
                "avg_inference_ms": round(float(avg_inf), 1),
            },
        }

    @staticmethod
    async def get_history_detail(session: AsyncSession, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves complete audit details for a specific AI queue task."""
        row = await session.get(AIQueueTaskDB, task_id)
        if not row:
            return None

        return {
            "id": row.id,
            "task_type": row.task_type,
            "source": row.source,
            "status": row.status,
            "camera_id": row.camera_id,
            "camera_name": row.camera_name,
            "location_hint": row.location_hint,
            "camera_angle": row.camera_angle,
            "cycle_id": row.cycle_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "started_at": row.started_at.isoformat() if row.started_at else None,
            "completed_at": row.completed_at.isoformat() if row.completed_at else None,
            "duration_ms": row.duration_ms,
            "queue_wait_ms": row.queue_wait_ms,
            "inference_time_ms": row.inference_time_ms,
            "model_used": row.model_used,
            "tokens_used": row.tokens_used,
            "flood_detected": row.flood_detected,
            "depth_level": row.depth_level,
            "depth_estimate_cm_min": row.depth_estimate_cm_min,
            "depth_estimate_cm_max": row.depth_estimate_cm_max,
            "confidence_score": row.confidence_score,
            "reference_objects": row.get_reference_objects(),
            "reasoning": row.reasoning,
            "alert_message": row.alert_message,
            "error_message": row.error_message,
            "prompt_preview": row.prompt_preview,
            "raw_response": row.raw_response,
            "snapshot_url": row.snapshot_url,
        }

    @staticmethod
    async def clear_history(session: AsyncSession) -> int:
        """Deletes all persistent AI queue audit history from database."""
        res = await session.execute(delete(AIQueueTaskDB))
        await session.commit()
        return res.rowcount or 0

    # ================= REAL-TIME QUEUE STATUS SNAPSHOT =================

    def get_status(self) -> Dict[str, Any]:
        """Provides snapshot of queue status, countdown, and progress."""
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
            "max_cameras_per_cycle": self.max_cameras_per_cycle,
            "current_camera_id": self.current_camera_id,
            "current_camera_name": self.current_camera_name,
            "current_task_type": self.current_task_type,
            "queue_length": self._queue.qsize(),
            "current_cycle_id": self.current_cycle_id,
            "cycle_progress": self.cycle_progress,
            "last_cycle_started_at": self.last_cycle_started_at.isoformat() if self.last_cycle_started_at else None,
            "last_cycle_completed_at": self.last_cycle_completed_at.isoformat() if self.last_cycle_completed_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "next_run_in_seconds": remaining_sec,
            "last_cycle_summary": self.last_cycle_summary,
            "recent_results": self.recent_results[:20],
        }


# Singleton instance for application-wide use
flood_queue_service = FloodAnalysisQueue()
