import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Callable, Dict, List, Optional
import uuid

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.db_models import AIQueueTaskDB
from app.services.flood_queue.discovery import CameraDiscoverer
from app.services.flood_queue.executor import TaskExecutor
from app.services.flood_queue.models import QueueItem

logger = logging.getLogger("floodwheel.queue_loop")


class QueueWorkerLoop:
    """Manages the background worker loop, cycle scheduling, and camera queueing."""

    def __init__(
        self,
        queue: asyncio.PriorityQueue,
        enqueued_ids: set,
        wake_event: asyncio.Event,
        executor: TaskExecutor,
        discoverer: CameraDiscoverer,
        sync_redis_cb: Callable,
        record_result_cb: Callable,
        get_seq_counter: Callable[[], int],
        inc_seq_counter: Callable[[], int],
    ):
        self.queue = queue
        self.enqueued_ids = enqueued_ids
        self.wake_event = wake_event
        self.executor = executor
        self.discoverer = discoverer
        self.sync_redis_cb = sync_redis_cb
        self.record_result_cb = record_result_cb
        self.get_seq_counter = get_seq_counter
        self.inc_seq_counter = inc_seq_counter

        self.running: bool = False
        self.paused: bool = False
        self.auto_cycle_enabled: bool = getattr(settings, "FLOOD_QUEUE_AUTO_START", False)
        self.status: str = "idle"
        self.current_cycle_id: int = 0
        self.current_camera_id: Optional[str] = None
        self.current_camera_name: Optional[str] = None
        self.current_task_type: Optional[str] = None

        self.last_cycle_started_at: Optional[datetime] = None
        self.last_cycle_completed_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None
        self.interval_seconds: int = 1800
        self.max_cameras_per_cycle: int = 15

        self.cycle_progress: Dict[str, Any] = {
            "cycle_id": 0, "total": 0, "processed": 0, "success": 0, "skipped": 0, "failed": 0, "flooded": 0
        }
        self.last_cycle_summary: Dict[str, Any] = {}

    async def run(self):
        logger.info("AI Queue worker started. Monitoring priority tasks and cycle scheduler.")
        await asyncio.sleep(3)

        while self.running:
            try:
                if not self.queue.empty():
                    _, _, item = await self.queue.get()
                    try:
                        await self.execute_item(item)
                    finally:
                        if item.camera_id:
                            self.enqueued_ids.discard(item.camera_id)
                        self.queue.task_done()
                        await self.sync_redis_cb()
                    continue

                now = datetime.now(timezone.utc)
                should_run_cycle = not self.paused and (
                    (self.next_run_at and now >= self.next_run_at)
                    or (self.next_run_at is None and self.auto_cycle_enabled)
                )
                if should_run_cycle:
                    await self.launch_scheduled_cycle()
                    continue

                self.status = "idle"
                self.current_camera_id = None
                self.current_camera_name = None
                self.current_task_type = None
                await self.sync_redis_cb()

                sleep_sec = float(self.interval_seconds)
                if self.next_run_at:
                    rem = (self.next_run_at - datetime.now(timezone.utc)).total_seconds()
                    sleep_sec = max(1.0, min(float(self.interval_seconds), rem))
                elif not self.auto_cycle_enabled:
                    sleep_sec = 86400.0  # Sleep until awakened by a submitted task or manual trigger

                self.wake_event.clear()
                try:
                    await asyncio.wait_for(self.wake_event.wait(), timeout=sleep_sec)
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

    async def launch_scheduled_cycle(self):
        self.status = "running"
        self.current_cycle_id += 1
        cycle_start_time = datetime.now(timezone.utc)
        self.last_cycle_started_at = cycle_start_time
        self.next_run_at = None

        logger.info("=== Starting AI Flood Analysis Cycle #%d ===", self.current_cycle_id)
        candidates = await self.discoverer.discover_all_cameras(self.max_cameras_per_cycle)
        self.cycle_progress = {
            "cycle_id": self.current_cycle_id,
            "total": len(candidates),
            "processed": 0, "success": 0, "skipped": 0, "failed": 0, "flooded": 0,
        }

        for c in candidates:
            cid = c.get("id")
            cname = c.get("name") or cid
            if cid and cid not in self.enqueued_ids:
                self.enqueued_ids.add(cid)
                seq = self.inc_seq_counter()
                task_id = f"task_{uuid.uuid4().hex[:12]}"

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
                await self.queue.put((10, seq, item))

        await self.sync_redis_cb()

    async def execute_item(self, item: QueueItem):
        self.status = "running"
        self.current_camera_id = item.camera_id
        self.current_camera_name = item.camera_name or item.camera_id
        self.current_task_type = item.task_type
        await self.sync_redis_cb()

        result_data = await self.executor.execute(item)
        status_str = result_data["status_str"]
        completed_at = result_data["completed_at"]
        res = result_data["res"]

        self.record_result_cb(result_data["recent_entry"])

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

            if self.cycle_progress["processed"] >= self.cycle_progress["total"]:
                self.finish_cycle(completed_at)

    def finish_cycle(self, cycle_end_time: datetime):
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
            "max_depth_cm": 0,
        }
        if self.auto_cycle_enabled:
            self.next_run_at = cycle_end_time + timedelta(seconds=self.interval_seconds)
            logger.info(
                "=== Cycle #%d Completed in %.1fs: %d cameras (%d flooded). Next in %d min at %s ===",
                self.current_cycle_id, duration_sec, self.cycle_progress["total"],
                self.cycle_progress["flooded"], self.interval_seconds // 60, self.next_run_at.isoformat(),
            )
        else:
            self.next_run_at = None
            logger.info(
                "=== Cycle #%d Completed in %.1fs: %d cameras (%d flooded). Auto cycle disabled (idle) ===",
                self.current_cycle_id, duration_sec, self.cycle_progress["total"],
                self.cycle_progress["flooded"],
            )
