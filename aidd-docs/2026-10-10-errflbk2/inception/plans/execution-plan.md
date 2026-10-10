# FloodWheel — Execution Plan

## Construction Phase Breakdown

### Phase 1: Core Detection & Disk Storage Foundation
- **Goal**: Implement `ImageValidator` and `SnapshotStorageService` with dedicated unit tests.
- **Tasks**:
  1. Create `camera-backend/app/services/image_validator.py` with multi-factor detection logic (hashes, headers, dimensions).
  2. Create `camera-backend/app/services/storage_service.py` with async atomic disk write and read methods.
  3. Update `camera-backend/app/core/config.py` with `SNAPSHOT_STORAGE_DIR`.
  4. Write unit tests for `ImageValidator` testing both real CCTV JPEG bytes and the real `sample_error_snapshot.jpeg`.
  5. Write unit tests for `SnapshotStorageService` testing atomic write, retrieval, and edge cases.

### Phase 2: Provider & Catalog Integration
- **Goal**: Integrate validation and disk fallback into `HCMCCameraProvider` and `CatalogService`.
- **Tasks**:
  1. Update `HCMCCameraProvider.get_snapshot` to check `ImageValidator.is_valid_snapshot`.
  2. If upstream frame is invalid, attempt to load disk snapshot via `SnapshotStorageService`.
  3. If disk snapshot missing, generate synthetic frame.
  4. Update `CatalogService.get_snapshot` to persist valid live frames to disk asynchronously.
  5. Add fallback telemetry headers (`X-Fallback-Source`, `X-Cache-Hit`) in API responses.

### Phase 3: Integration Verification & Docker Setup
- **Goal**: End-to-end testing and environment verification.
- **Tasks**:
  1. Run full test suite with `pytest`.
  2. Verify Docker volume binding for `camera-backend/storage/snapshots/`.
  3. Validate fallback behavior with mock endpoints and real sample error images.
