# FloodWheel — Component Methods Specification

## 1. `ImageValidator`
```python
class ImageValidator:
    KNOWN_ERROR_MD5 = {"9653ea117b2c39d4c477b0949f95860e"}
    KNOWN_ERROR_SHA256 = {"44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba"}
    MINIMUM_VALID_SIZE = 500  # bytes
    MAXIMUM_ERROR_PNG_SIZE = 6000  # bytes

    @classmethod
    def is_error_placeholder(cls, data: bytes) -> bool:
        """Returns True if the payload matches known error banners."""
        ...

    @classmethod
    def is_valid_snapshot(cls, data: bytes) -> bool:
        """Returns True only if payload is non-empty, not an error placeholder,
        and is a decodable image.
        """
        ...
```

## 2. `SnapshotStorageService`
```python
class SnapshotStorageService:
    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = Path(storage_dir or settings.SNAPSHOT_STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, camera_id: str) -> Path:
        """Sanitizes camera_id and returns target Path."""
        ...

    async def save_snapshot(self, camera_id: str, image_bytes: bytes) -> Path:
        """Atomically saves valid image bytes to disk."""
        ...

    async def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        """Reads snapshot bytes from disk if exists, otherwise None."""
        ...

    async def has_snapshot(self, camera_id: str) -> bool:
        """Checks if a snapshot exists on disk for the camera."""
        ...
```

## 3. `CatalogService.get_snapshot`
```python
async def get_snapshot(
    self,
    camera_id: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    force_refresh: bool = False,
) -> Tuple[bytes, str, bool, str]:
    """Returns (frame_bytes, content_type, is_cached_hit, fallback_source)."""
    ...
```
