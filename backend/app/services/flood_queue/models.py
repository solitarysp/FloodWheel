import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional


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
        self.task_type = task_type
        self.source = source
        self.priority = priority
        self.params = params
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.cycle_id = cycle_id
        self.created_at = datetime.now(timezone.utc)
        self.future: Optional[asyncio.Future] = None
