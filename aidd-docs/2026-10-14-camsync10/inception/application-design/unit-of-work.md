# Units of Work Specification — Session 2026-10-14-camsync10

## Unit List

### UOW-SYNC-001: Autonomous Snapshot Crawler in `camera-backend`
- **Goal**: Implement periodic 10-minute snapshot crawler worker with concurrency limit, frame validation, and disk persistence.
- **Files Modified/Created**:
  - `camera-backend/app/services/snapshot_crawler.py` (NEW, <= 180 lines)
  - `camera-backend/app/core/config.py` (Add interval and crawler settings, <= 85 lines)
  - `camera-backend/app/main.py` (Wire crawler to lifespan, <= 115 lines)
  - `camera-backend/app/api/v1/endpoints/cameras.py` (Add crawler status endpoint, <= 110 lines)
- **Acceptance Criteria**:
  - Crawler triggers every 10 minutes (configurable).
  - Validates frames and stores to `storage/snapshots/{camera_id}.jpg`.
  - Exposes metrics via `GET /api/v1/cameras/crawler/status`.

### UOW-SYNC-002: Storage-Only Read Pipeline in `backend`
- **Goal**: Modify `backend` snapshot retrieval to strictly read existing files from disk during scheduled AI cycles without issuing outbound network requests.
- **Files Modified/Created**:
  - `backend/app/services/camera_stream_service.py` (Support `storage_only` mode, <= 230 lines)
  - `backend/app/services/flood_analysis_service.py` (Enforce disk read during scheduled scans, <= 250 lines)
  - `backend/app/services/camera_service_client.py` (Support storage check fallback, <= 140 lines)
- **Acceptance Criteria**:
  - Zero external HTTP calls made during scheduled flood analysis cycles.
  - If a file is missing on disk, analysis gracefully skips/marks offline without errors.

### UOW-SYNC-003: Integration & Line Limit Verification
- **Goal**: Verify crawler background loop, storage persistence, backend disk reader, and verify compliance with line limit rules.
- **Files Modified/Created**:
  - `camera-backend/tests/test_snapshot_crawler.py` (NEW, unit tests)
  - `backend/tests/test_storage_reader.py` (NEW, unit tests)
- **Acceptance Criteria**:
  - All test suites pass.
  - `python3 scripts/check_line_limits.py` reports 100% compliance (< 250 lines).
