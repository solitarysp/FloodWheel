import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy import delete, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import AIQueueTaskDB

logger = logging.getLogger("floodwheel.queue_persistence")


class QueuePersistence:
    """Handles PostgreSQL persistence and history auditing for AI queue tasks."""

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

        count_stmt = select(func.count(AIQueueTaskDB.id))
        if filters:
            count_stmt = count_stmt.where(*filters)
        total_count = (await session.execute(count_stmt)).scalar() or 0

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
