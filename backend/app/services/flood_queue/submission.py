"""Submission helper for AI queue tasks."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid

from app.db.session import AsyncSessionLocal
from app.models.db_models import AIQueueTaskDB
from app.services.flood_queue.models import QueueItem

logger = logging.getLogger("floodwheel.queue_submission")


class QueueSubmission:
    """Handles enqueuing tasks into the priority queue and persistence."""

    @staticmethod
    async def submit_task(
        queue_instance,
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
        if not queue_instance._running or queue_instance._loop_task is None or queue_instance._loop_task.done():
            await queue_instance.start()

        task_id = f"task_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc)
        cid = str(camera_id).strip() if camera_id else None
        cname = camera_name or cid
        snapshot_url = f"/api/v1/cameras/{cid}/snapshot" if cid else None

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
        except Exception:
            pass

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
        if wait_result:
            item.future = asyncio.get_running_loop().create_future()

        queue_instance._seq_counter += 1
        await queue_instance._queue.put((priority, queue_instance._seq_counter, item))

        if cycle_id and cycle_id == queue_instance.current_cycle_id:
            queue_instance.worker.cycle_progress["total"] += 1

        queue_instance._wake_event.set()
        await queue_instance._sync_state_to_redis()

        if wait_result and item.future:
            try:
                return await asyncio.wait_for(item.future, timeout=timeout)
            except asyncio.TimeoutError:
                raise TimeoutError(f"AI task {task_id} timed out waiting in queue.")

        return task_id

    @staticmethod
    async def enqueue_cameras(queue_instance, camera_ids: List[str]) -> int:
        enqueued_count = 0
        for cid in camera_ids:
            clean_id = str(cid).strip()
            if clean_id and clean_id not in queue_instance._enqueued_ids:
                queue_instance._enqueued_ids.add(clean_id)
                await queue_instance.submit_task(
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
