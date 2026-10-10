"""API Dependency Providers."""

from typing import Optional
from fastapi import Request
from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService
from app.services.storage_service import SnapshotStorageService


def get_catalog_service(request: Request) -> CatalogService:
    """Retrieves the singleton CatalogService from app state."""
    return request.app.state.catalog_service


def get_cache_service(request: Request) -> CacheService:
    """Retrieves the singleton CacheService from app state."""
    return request.app.state.cache_service


def get_storage_service(request: Request) -> SnapshotStorageService:
    """Retrieves the singleton SnapshotStorageService from app state."""
    return request.app.state.storage_service

