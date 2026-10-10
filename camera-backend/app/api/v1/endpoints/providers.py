"""Camera provider management and synchronization endpoints."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_catalog_service
from app.models.camera import ProviderSyncResult
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/providers", tags=["Providers"])


@router.get("", response_model=Dict[str, Any])
async def list_providers(
    catalog: CatalogService = Depends(get_catalog_service),
):
    """Lists registered camera providers and their telemetry."""
    return catalog.list_providers()


@router.post("/{provider_name}/sync", response_model=ProviderSyncResult)
async def sync_provider_catalog(
    provider_name: str,
    catalog: CatalogService = Depends(get_catalog_service),
):
    """Triggers on-demand catalog extraction for a provider (e.g. 'hcmc')."""
    provider = catalog.get_provider(provider_name)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera provider '{provider_name}' not registered.",
        )

    result = await catalog.sync_provider(provider_name)
    return result
