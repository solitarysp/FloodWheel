# FloodWheel — Component Dependency Map

| Component | Depends On | Depended On By |
|---|---|---|
| `ImageValidator` | `hashlib`, `PIL.Image` | `HCMCCameraProvider`, `CatalogService` |
| `SnapshotStorageService` | `aiofiles` / `anyio`, `pathlib`, `Settings` | `HCMCCameraProvider`, `CatalogService` |
| `HCMCCameraProvider` | `ImageValidator`, `SnapshotStorageService`, `HTTPX`, `CacheService` | `CatalogService` |
| `CatalogService` | `HCMCCameraProvider`, `CacheService`, `SnapshotStorageService` | `CameraRouter` |
| `CameraRouter` | `CatalogService` | External HTTP Clients |
