from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QueueTaskSummary(BaseModel):
    id: str
    task_type: str = Field(..., description="cycle_camera, single_camera, batch_camera, image_upload")
    source: str = Field(..., description="automated_scheduler, camera_grid, admin_dashboard, demo_upload, api")
    status: str = Field(..., description="QUEUED, PROCESSING, COMPLETED, FAILED, SKIPPED")

    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    cycle_id: Optional[int] = None

    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    duration_ms: Optional[float] = None
    queue_wait_ms: Optional[float] = None
    inference_time_ms: Optional[float] = None

    model_used: Optional[str] = None
    tokens_used: Optional[int] = None

    flood_detected: Optional[bool] = None
    depth_level: Optional[int] = None
    depth_estimate_cm_min: Optional[int] = 0
    depth_estimate_cm_max: Optional[int] = 0
    confidence_score: Optional[float] = None
    alert_message: Optional[str] = None
    error_message: Optional[str] = None
    snapshot_url: Optional[str] = None

    class Config:
        from_attributes = True


class QueueTaskDetail(QueueTaskSummary):
    location_hint: Optional[str] = None
    camera_angle: Optional[str] = "elevated"
    reference_objects: List[str] = []
    reasoning: Optional[str] = None
    prompt_preview: Optional[str] = None
    raw_response: Optional[str] = None


class QueueHistoryStats(BaseModel):
    total_calls: int = 0
    completed_count: int = 0
    flooded_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    avg_inference_ms: float = 0.0


class QueueHistoryListResponse(BaseModel):
    items: List[QueueTaskSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: QueueHistoryStats
