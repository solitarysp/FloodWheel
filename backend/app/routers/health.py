from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "floodwheel-backend",
        "environment": settings.ENVIRONMENT,
        "gemini_model": settings.GEMINI_MODEL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
