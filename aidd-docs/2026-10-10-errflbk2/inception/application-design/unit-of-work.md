# FloodWheel — Units of Work (UOW)

## UOW-ERR-001: Image Validation Engine
- **Component**: `camera-backend/app/services/image_validator.py`
- **Scope**:
  - Implement `ImageValidator` class with known hash sets (MD5, SHA256).
  - Add heuristics for PNG headers on JPEG endpoints and undersized payloads (< 500 bytes).
  - Add `is_error_placeholder` and `is_valid_snapshot` methods.
  - Implement comprehensive unit tests in `tests/test_image_validator.py` using `sample_error_snapshot.jpeg` and synthetic valid JPEGs.
- **Estimated Complexity**: Low
- **Dependencies**: None

---

## UOW-ERR-002: Snapshot Disk Storage Service
- **Component**: `camera-backend/app/services/storage_service.py` & `app/core/config.py`
- **Scope**:
  - Add `SNAPSHOT_STORAGE_DIR` setting to `Settings` (default `storage/snapshots`).
  - Implement `SnapshotStorageService` with async non-blocking file I/O (`aiofiles` or `anyio`).
  - Ensure safe path sanitization against directory traversal (`../` removal).
  - Implement atomic write via `.tmp` file swap.
  - Implement unit tests in `tests/test_storage_service.py` covering save, get, and overwrite.
- **Estimated Complexity**: Low
- **Dependencies**: None

---

## UOW-ERR-003: Provider & Catalog Integration & Fallback Routing
- **Component**: `app/providers/hcmc.py`, `app/services/catalog_service.py`, `app/api/v1/endpoints/cameras.py`
- **Scope**:
  - Wire `SnapshotStorageService` and `ImageValidator` into `HCMCCameraProvider` and `CatalogService`.
  - Update `HCMCCameraProvider.get_snapshot` to reject invalid payloads and fetch from `SnapshotStorageService` on upstream failure.
  - If disk snapshot is also unavailable, fall back to `generate_mock_frame`.
  - Update `CatalogService.get_snapshot` to persist valid live frames immediately to disk storage.
  - Expose telemetry header `X-Fallback-Source` in `CameraRouter`.
  - Write integration tests in `tests/test_cameras_api.py`.
- **Estimated Complexity**: Medium
- **Dependencies**: UOW-ERR-001, UOW-ERR-002
