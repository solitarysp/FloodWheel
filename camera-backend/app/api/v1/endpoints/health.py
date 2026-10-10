"""Service health and readiness probes."""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.api.deps import get_cache_service, get_catalog_service
from app.core.config import settings
from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(
    cache: CacheService = Depends(get_cache_service),
    catalog: CatalogService = Depends(get_catalog_service),
) -> Dict[str, Any]:
    """Health check endpoint reporting microservice status."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "redis_connected": cache.is_connected(),
        "providers": catalog.list_providers(),
    }
