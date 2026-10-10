"""Service modules for Camera Backend."""

from typing import Any


def __getattr__(name: str) -> Any:
    if name == "CacheService":
        from app.services.cache_service import CacheService
        return CacheService
    if name == "CatalogService":
        from app.services.catalog_service import CatalogService
        return CatalogService
    if name == "ImageValidator":
        from app.services.image_validator import ImageValidator
        return ImageValidator
    if name == "SnapshotStorageService":
        from app.services.storage_service import SnapshotStorageService
        return SnapshotStorageService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["CacheService", "CatalogService", "ImageValidator", "SnapshotStorageService"]
