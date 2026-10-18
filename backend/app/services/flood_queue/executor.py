import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, Optional

from app.db.session import AsyncSessionLocal
from app.models.db_models import AIQueueTaskDB
from app.models.flood_reading import AnalysisResponse
from app.services.flood_analysis_service import FloodAnalysisService
from app.services.flood_queue.models import QueueItem

logger = logging.getLogger("floodwheel.queue_executor")


class TaskExecutor:
    """Executes a single queue task against FloodAnalysisService and records status."""

    def __init__(self, analysis_service: FloodAnalysisService):
        self.analysis_service = analysis_service

    async def execute(self, item: QueueItem) -> Dict[str, Any]:
        started_at = datetime.now(timezone.utc)
        queue_wait_ms = round((started_at - item.created_at).total_seconds() * 1000, 1)

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

        res: Optional[AnalysisResponse] = None
        error_msg: Optional[str] = None

        try:
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
                image_b64 = item.params.get("image_base64")
                force_ref = item.params.get("force_refresh", False)
                # For automated cycle runs, request stored snapshot frames via camera-backend API
                storage_only = (item.task_type == "cycle_camera" or item.source == "automated_scheduler")
                async with AsyncSessionLocal() as session:
                    res = await self.analysis_service.analyze_single_camera(
                        session=session,
                        camera_id=item.camera_id,
                        image_base64=image_b64,
                        force_refresh=force_ref,
                        storage_only=storage_only,
                    )

            if res:
                res.task_id = item.task_id

        except Exception as exc:
            logger.error("Error executing AI queue task %s: %s", item.task_id, exc)
            error_msg = str(exc)

        completed_at = datetime.now(timezone.utc)
        duration_ms = round((completed_at - started_at).total_seconds() * 1000, 1)

        if error_msg:
            status_str = "FAILED"
        elif res and res.model_used == "skipped-default-image":
            status_str = "SKIPPED"
        else:
            status_str = "COMPLETED"

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

        if item.future and not item.future.done():
            if error_msg:
                item.future.set_exception(Exception(error_msg))
            else:
                item.future.set_result(res)

        if status_str == "COMPLETED" and res and res.model_used not in ("cache-hit", "skipped-default-image"):
            await asyncio.sleep(0.5)
        else:
            await asyncio.sleep(0.05)

        return {
            "status_str": status_str,
            "completed_at": completed_at,
            "res": res,
            "recent_entry": recent_entry,
        }
