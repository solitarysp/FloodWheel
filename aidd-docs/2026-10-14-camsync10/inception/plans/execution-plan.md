# Workflow Execution Plan — Session 2026-10-14-camsync10

## Execution Strategy
The implementation is decomposed into 3 decoupled, focused Units of Work (UOW):

### Phase 1: Periodic Snapshot Crawler Service in `camera-backend` (UOW-SYNC-001)
- Create `camera-backend/app/services/snapshot_crawler.py` (Worker loop, batch iterator, bounded semaphore, pacing).
- Keep file size <= 200 lines.
- Wire `snapshot_crawler` into application lifespan in `camera-backend/app/main.py`.
- Add environment variables in `camera-backend/app/core/config.py` (`SNAPSHOT_CRAWL_INTERVAL_SECONDS`, `SNAPSHOT_CRAWL_CONCURRENCY`).
- Expose crawler status endpoint (e.g. `GET /api/v1/cameras/crawler/status`) for observability.

### Phase 2: Read-Only Storage Ingestion in `backend` (UOW-SYNC-002)
- Update `CameraStreamService.get_snapshot_bytes()` to support a strict disk/storage-only mode.
- Update `FloodAnalysisService.analyze_single_camera()`: when analyzing scheduled cycles, read directly from disk snapshot. If no file exists, log and record clean skip/offline result without issuing external requests.
- Ensure all modified files stay well within the 250-line boundary.

### Phase 3: Integration Verification & Regression Testing (UOW-SYNC-003)
- Unit tests for `snapshot_crawler.py` with mock HCMC provider.
- Unit and integration tests for backend's storage-only snapshot loader.
- Verify Docker volume mounting (`./camera-backend/storage/snapshots:/app/storage/snapshots:ro`).
- Run code limit verification script (`scripts/check_line_limits.py`).
