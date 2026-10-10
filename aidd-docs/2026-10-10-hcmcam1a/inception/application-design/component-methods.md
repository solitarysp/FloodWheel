# Stage 6 — Application Design: Component Methods

## 1. `HCMCCameraProvider` Methods
```python
class HCMCCameraProvider(BaseCameraProvider):
    async def init_session(self) -> Dict[str, str]:
        """Performs async GET to /map.aspx and extracts required cookies (.VDMS)."""

    def _clean_ajaxpro_response(self, text: str) -> str:
        """Parses AjaxPro DataTable JS syntax 'new Ajax.Web.DataTable(...)' into JSON."""

    def _parse_coordinates(self, shape_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
        """Extracts latitude and longitude from 'POINT(lng lat)' format."""

    async def get_cameras(self, force_refresh: bool = False) -> List[CameraModel]:
        """POSTs to FolderAjax.ashx SearchQuery and returns structured CameraModel instances."""

    async def get_snapshot(self, camera_id: str, width: Optional[int] = None, height: Optional[int] = None) -> bytes:
        """GETs snapshot JPEG from :8007 CameraHandler.ashx using session cookies."""

    async def health_check(self) -> Dict[str, Any]:
        """Verifies connectivity to municipal endpoints."""
```

## 2. `CatalogService` Methods
```python
class CatalogService:
    def register_provider(self, provider: BaseCameraProvider) -> None:
        """Registers a camera provider instance."""

    async def get_cameras(
        self,
        city: Optional[str] = "hcmc",
        district: Optional[str] = None,
        keyword: Optional[str] = None,
        bbox: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> CameraListResponse:
        """Filters in-memory/persisted catalog matching criteria."""

    async def get_camera_by_id(self, camera_id: str) -> Optional[CameraModel]:
        """Fast lookup by camera ID."""

    async def get_snapshot(self, camera_id: str, width: Optional[int] = None, height: Optional[int] = None) -> Tuple[bytes, str]:
        """Checks CacheService; if miss, delegates to the owning provider, caches result, and returns bytes."""

    async def sync_provider(self, provider_name: str) -> SyncResult:
        """Triggers manual or background catalog extraction and updates catalog."""
```

## 3. `CameraServiceClient` (Core Backend) Methods
```python
class CameraServiceClient:
    async def get_all_cameras(self, city: str = "hcmc", district: Optional[str] = None) -> List[CameraResponse]:
        """Queries camera-backend:8001/api/v1/cameras with timeout and circuit breaker."""

    async def get_camera_by_id(self, camera_id: str) -> Optional[CameraResponse]:
        """Queries camera-backend:8001/api/v1/cameras/{id}."""

    async def get_snapshot_bytes(self, camera_id: str, camera_name: str = "") -> Tuple[bytes, str]:
        """Fetches JPEG bytes from camera-backend:8001, falling back to synthetic frame on error."""
```
