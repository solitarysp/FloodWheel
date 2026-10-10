# FloodWheel — Component Inventory

## 1. Existing Components

| Component | Path | Responsibility | Current Limitations |
|---|---|---|---|
| `HCMCCameraProvider` | `app/providers/hcmc.py` | Connects to `map.aspx`, manages cookies, fetches frames from port 8007. | Treats any 200 HTTP response > 50 bytes as valid; does not inspect for "IMAGE NOT AVAILABLE" placeholder. |
| `CatalogService` | `app/services/catalog_service.py` | Orchestrates provider queries, maintains in-memory lookup index, manages Redis cache. | No integration with persistent disk storage; writes error payloads directly into Redis. |
| `CacheService` | `app/services/cache_service.py` | Async wrapper around Redis connection pool for snapshot and cookie TTLs. | In-memory only; cache expires in 10 seconds; no long-term persistence across restarts. |
| `CameraRouter` | `app/api/v1/endpoints/cameras.py` | Exposes `/api/v1/cameras` and `/api/v1/cameras/{id}/snapshot`. | Relies entirely on `CatalogService.get_snapshot`. |

## 2. New / Modified Components

| Component | Path | Responsibility |
|---|---|---|
| `ImageValidator` | `app/services/image_validator.py` | Evaluates snapshot byte buffers against known error signatures (MD5/SHA256, PNG header mismatch, minimum size, corrupt buffers). |
| `SnapshotStorageService` | `app/services/storage_service.py` | Manages local filesystem storage (`storage/snapshots/{camera_id}.jpg`), writes valid frames atomically, and retrieves last-known-good images. |
| `HCMCCameraProvider` (updated) | `app/providers/hcmc.py` | Uses `ImageValidator` to reject invalid frames, triggers auto-reauth or fallback retrieval. |
| `CatalogService` (updated) | `app/services/catalog_service.py` | Coordinates the 3-tier retrieval strategy: Redis -> Disk Storage fallback -> External Provider -> Synthetic frame. Writes valid images to disk immediately. |
