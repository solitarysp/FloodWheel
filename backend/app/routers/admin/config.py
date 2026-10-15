"""Admin System Configuration Router.

Provides endpoints to view system, AI, and queue configurations (View-Only).
"""

import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.config import settings
from app.middleware.auth import AdminUser, get_current_admin
from app.services.flood_queue_service import flood_queue_service

logger = logging.getLogger("floodwheel.admin_config")
router = APIRouter()


def _mask_secret(val: str, prefix_len: int = 6, suffix_len: int = 4) -> str:
    """Masks sensitive strings like API keys, passwords, and tokens."""
    if not val:
        return ""
    if len(val) <= prefix_len + suffix_len:
        return "***"
    return f"{val[:prefix_len]}...{val[-suffix_len:]}"


def _mask_url_credentials(url_str: str) -> str:
    """Masks username/password in database or cache URLs."""
    if not url_str or "@" not in url_str:
        return url_str
    try:
        prefix, host_part = url_str.split("@", 1)
        scheme_and_user = prefix.split("//", 1)
        if len(scheme_and_user) == 2 and ":" in scheme_and_user[1]:
            scheme = scheme_and_user[0]
            user = scheme_and_user[1].split(":")[0]
            return f"{scheme}//{user}:***@{host_part}"
        return f"...@{host_part}"
    except Exception:
        return "...@..."


def get_system_config_dict() -> Dict[str, Any]:
    """Builds a secure, masked summary of the application configuration."""
    raw_keys = settings.GEMINI_API_KEYS or settings.GEMINI_API_KEY or ""
    keys_list = [k.strip() for k in raw_keys.split(",") if k.strip()]
    masked_keys = [_mask_secret(k) for k in keys_list]

    live_concurrency = getattr(flood_queue_service.worker, "concurrency", settings.AI_ANALYSIS_CONCURRENCY)

    return {
        "success": True,
        "ai": {
            "concurrency": live_concurrency,
            "primary_model": settings.GEMINI_MODEL,
            "fallback_model": settings.GEMINI_FALLBACK_MODEL,
            "min_call_interval_seconds": float(getattr(settings, "GEMINI_MIN_CALL_INTERVAL_SECONDS", 6.0)),
            "base_url": settings.GEMINI_BASE_URL or "Default (Google AI Studio)",
            "api_keys_count": len(keys_list),
            "api_keys_preview": masked_keys[:5],
        },
        "queue": {
            "interval_minutes": flood_queue_service.interval_seconds // 60,
            "max_cameras_per_cycle": flood_queue_service.max_cameras_per_cycle,
            "auto_start": getattr(settings, "FLOOD_QUEUE_AUTO_START", False),
            "cache_minutes": getattr(settings, "FLOOD_ANALYSIS_CACHE_MINUTES", 5),
            "status": flood_queue_service.status,
            "is_processing": flood_queue_service.status == "running",
        },
        "system": {
            "environment": settings.ENVIRONMENT,
            "log_level": settings.LOG_LEVEL,
            "camera_backend_url": settings.CAMERA_BACKEND_URL,
            "snapshot_storage_dir": settings.SNAPSHOT_STORAGE_DIR,
            "database_url": _mask_url_credentials(settings.DATABASE_URL),
            "redis_url": _mask_url_credentials(settings.REDIS_URL),
            "cors_origins": settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
            "max_image_size_mb": settings.MAX_IMAGE_SIZE_MB,
            "max_images_per_request": settings.MAX_IMAGES_PER_REQUEST,
        },
    }


@router.get("/config")
async def get_admin_config(
    current_admin: AdminUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Returns application environment and runtime configuration parameters (View-Only)."""
    return get_system_config_dict()
