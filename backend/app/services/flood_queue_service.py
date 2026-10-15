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
from typing import Any, Dict, List, Optional, Set

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.camera_service_client import CameraServiceClient
from app.services.flood_analysis_service import FloodAnalysisService
from app.services.flood_queue.discovery import CameraDiscoverer
from app.services.flood_queue.executor import TaskExecutor
from app.services.flood_queue.loop import QueueWorkerLoop
from app.services.flood_queue.models import QueueItem
from app.services.flood_queue.persistence import QueuePersistence
from app.services.flood_queue.submission import QueueSubmission

logger = logging.getLogger("floodwheel.queue_service")


class FloodAnalysisQueue:
    """Background asynchronous queue and cyclical scheduler for AI flood analysis."""

    def __init__(self, interval_minutes: Optional[int] = None):
        interval_m = interval_minutes or getattr(settings, "FLOOD_QUEUE_INTERVAL_MINUTES", 30)
        self.interval_seconds: int = int(interval_m * 60)
        self.max_cameras_per_cycle: int = getattr(settings, "FLOOD_QUEUE_MAX_CAMERAS_PER_CYCLE", 15)

        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._seq_counter: int = 0
        self._enqueued_ids: Set[str] = set()
        self._wake_event: asyncio.Event = asyncio.Event()

        self._running: bool = False
        self._loop_task: Optional[asyncio.Task] = None
        self.recent_results: List[Dict[str, Any]] = []

        self.analysis_service = FloodAnalysisService()
        self.camera_service_client = CameraServiceClient()
        self.executor = TaskExecutor(self.analysis_service)
        self.discoverer = CameraDiscoverer(self.camera_service_client)

        self.worker = QueueWorkerLoop(
            queue=self._queue,
            enqueued_ids=self._enqueued_ids,
            wake_event=self._wake_event,
            executor=self.executor,
            discoverer=self.discoverer,
            sync_redis_cb=self._sync_state_to_redis,
            record_result_cb=self._record_result,
            get_seq_counter=lambda: self._seq_counter,
            inc_seq_counter=self._inc_seq,
        )
        self.worker.interval_seconds = self.interval_seconds
        self.worker.max_cameras_per_cycle = self.max_cameras_per_cycle

        self._redis: Optional[Any] = None
        self.redis_url = getattr(settings, "REDIS_URL", "redis://redis:6379/0")

    def _inc_seq(self) -> int:
        self._seq_counter += 1
        return self._seq_counter

    # Delegate properties to worker
    @property
    def status(self) -> str: return self.worker.status
    @status.setter
    def status(self, val: str): self.worker.status = val
    @property
    def _paused(self) -> bool: return self.worker.paused
    @_paused.setter
    def _paused(self, val: bool): self.worker.paused = val
    @property
    def current_cycle_id(self) -> int: return self.worker.current_cycle_id
    @current_cycle_id.setter
    def current_cycle_id(self, val: int): self.worker.current_cycle_id = val

    @property
    def current_camera_id(self) -> Optional[str]: return self.worker.current_camera_id
    @property
    def current_camera_name(self) -> Optional[str]: return self.worker.current_camera_name
    @property
    def current_task_type(self) -> Optional[str]: return self.worker.current_task_type
    @property
    def last_cycle_started_at(self) -> Optional[datetime]: return self.worker.last_cycle_started_at
    @property
    def last_cycle_completed_at(self) -> Optional[datetime]: return self.worker.last_cycle_completed_at

    @property
    def next_run_at(self) -> Optional[datetime]: return self.worker.next_run_at
    @next_run_at.setter
    def next_run_at(self, val: Optional[datetime]): self.worker.next_run_at = val

    @property
    def cycle_progress(self) -> Dict[str, Any]: return self.worker.cycle_progress
    @cycle_progress.setter
    def cycle_progress(self, val: Dict[str, Any]): self.worker.cycle_progress = val

    @property
    def last_cycle_summary(self) -> Dict[str, Any]: return self.worker.last_cycle_summary
    @property
    def concurrency(self) -> int: return getattr(self.worker, "concurrency", 1)
    @concurrency.setter
    def concurrency(self, val: int): self.worker.concurrency = max(1, val)

    async def connect_redis(self) -> bool:
        if aioredis is None: return False
        try:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True, socket_connect_timeout=3.0)
            await self._redis.ping()
            return True
        except Exception:
            self._redis = None
            return False

    async def _sync_state_to_redis(self):
        if self._redis:
            try:
                await self._redis.set("floodwheel:queue:status", json.dumps(self.get_status()), ex=7200)
            except Exception: pass

    async def start(self):
        if not self._running:
            self._running = True
            self.worker.running = True
            self.worker.paused = False
            await self.connect_redis()
            self._loop_task = asyncio.create_task(self.worker.run())

    async def stop(self):
        if self._running:
            self._running = False
            self.worker.running = False
            self._wake_event.set()
            if self._loop_task and not self._loop_task.done():
                self._loop_task.cancel()
                try: await asyncio.wait_for(self._loop_task, timeout=5.0)
                except (asyncio.CancelledError, asyncio.TimeoutError): pass
            if self._redis:
                try: await self._redis.aclose()
                except Exception: pass
                self._redis = None
            self.status = "idle"

    async def pause(self) -> Dict[str, Any]:
        self.worker.paused = True
        self.worker.status = "paused"
        await self._sync_state_to_redis()
        return self.get_status()

    async def resume(self) -> Dict[str, Any]:
        self.worker.paused = False
        if self.worker.status == "paused":
            self.worker.status = "idle"
        self._wake_event.set()
        await self._sync_state_to_redis()
        return self.get_status()

    async def trigger_now(self) -> Dict[str, Any]:
        if not self._running or self._loop_task is None or self._loop_task.done():
            await self.start()
        self.worker.paused = False
        self.worker.next_run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self._wake_event.set()
        await self._sync_state_to_redis()
        return self.get_status()

    async def submit_task(self, task_type: str, source: str, params: Dict[str, Any], priority: int = 1, camera_id: Optional[str] = None, camera_name: Optional[str] = None, cycle_id: Optional[int] = None, wait_result: bool = False, timeout: float = 60.0) -> Any:
        return await QueueSubmission.submit_task(self, task_type, source, params, priority, camera_id, camera_name, cycle_id, wait_result, timeout)

    async def enqueue_cameras(self, camera_ids: List[str]) -> int:
        return await QueueSubmission.enqueue_cameras(self, camera_ids)

    def _record_result(self, item: Dict[str, Any]):
        self.recent_results.insert(0, item)
        if len(self.recent_results) > 50:
            self.recent_results = self.recent_results[:50]

    def remove_recent_result(self, camera_id: str) -> int:
        before = len(self.recent_results)
        self.recent_results = [r for r in self.recent_results if r.get("camera_id") != camera_id]
        return before - len(self.recent_results)

    def clear_recent_results(self) -> int:
        count = len(self.recent_results)
        self.recent_results = []
        return count

    @staticmethod
    async def get_history(session: AsyncSession, page: int = 1, page_size: int = 15, status: Optional[str] = None, task_type: Optional[str] = None, search: Optional[str] = None) -> Dict[str, Any]:
        return await QueuePersistence.get_history(session, page, page_size, status, task_type, search)

    @staticmethod
    async def get_history_detail(session: AsyncSession, task_id: str) -> Optional[Dict[str, Any]]:
        return await QueuePersistence.get_history_detail(session, task_id)

    @staticmethod
    async def clear_history(session: AsyncSession) -> int:
        return await QueuePersistence.clear_history(session)

    def get_status(self) -> Dict[str, Any]:
        remaining_sec = 0
        if self.worker.next_run_at and self.worker.status == "idle":
            rem = (self.worker.next_run_at - datetime.now(timezone.utc)).total_seconds()
            remaining_sec = max(0, int(rem))

        return {
            "is_running": self._running,
            "status": self.worker.status,
            "is_processing": self.worker.status == "running",
            "is_paused": self.worker.paused,
            "auto_cycle_enabled": getattr(self.worker, "auto_cycle_enabled", False),
            "concurrency": getattr(self.worker, "concurrency", 1),
            "interval_seconds": self.interval_seconds,
            "interval_minutes": round(self.interval_seconds / 60, 1),
            "max_cameras_per_cycle": self.max_cameras_per_cycle,
            "current_camera_id": self.worker.current_camera_id,
            "current_camera_name": self.worker.current_camera_name,
            "current_task_type": self.worker.current_task_type,
            "queue_length": self._queue.qsize(),
            "current_cycle_id": self.worker.current_cycle_id,
            "cycle_progress": self.worker.cycle_progress,
            "last_cycle_started_at": self.worker.last_cycle_started_at.isoformat() if self.worker.last_cycle_started_at else None,
            "last_cycle_completed_at": self.worker.last_cycle_completed_at.isoformat() if self.worker.last_cycle_completed_at else None,
            "next_run_at": self.worker.next_run_at.isoformat() if self.worker.next_run_at else None,
            "next_run_in_seconds": remaining_sec,
            "last_cycle_summary": self.worker.last_cycle_summary,
            "recent_results": self.recent_results[:20],
        }


flood_queue_service = FloodAnalysisQueue()
