# FloodWheel — Unit Interfaces

## 1. `ImageValidator`
```python
class ImageValidator:
    @classmethod
    def is_error_placeholder(cls, data: bytes) -> bool: ...

    @classmethod
    def is_valid_snapshot(cls, data: bytes) -> bool: ...
```

## 2. `SnapshotStorageService`
```python
class SnapshotStorageService:
    async def save_snapshot(self, camera_id: str, image_bytes: bytes) -> Path: ...
    async def get_snapshot(self, camera_id: str) -> Optional[bytes]: ...
    async def has_snapshot(self, camera_id: str) -> bool: ...
```

## 3. `CatalogService.get_snapshot`
```python
async def get_snapshot(
    self,
    camera_id: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    force_refresh: bool = False,
) -> Tuple[bytes, str, bool, str]: ...
# Returns: (image_bytes, content_type, is_cached_hit, fallback_source)
```
