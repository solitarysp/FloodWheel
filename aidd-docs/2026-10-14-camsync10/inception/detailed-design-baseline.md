# Detailed Design Baseline — Decoupled Snapshot Crawler & Read-Only Ingestion

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            camera-backend (:8001)                                 |
|                                                                                   |
|  [HCMC Traffic Portal]                                                            |
|          │                                                                        |
|          ▼ (bounded async fetch: concurrency=5..8, delay=50ms)                    |
|  [SnapshotCrawlerService] (Runs every 10 mins)                                    |
|          │                                                                        |
|          ├── Validate frame with ImageValidator (drop placeholders)               |
|          ├── Write valid frames: storage/snapshots/{camera_id}.jpg                |
|          └── Set Redis cache key (TTL=900s)                                       |
|                                                                                   |
|  [Endpoints]                                                                      |
|   - GET /api/v1/cameras/{id}/snapshot (returns cached or stored disk frame)      |
|   - GET /api/v1/cameras/crawler/status (crawler metrics & progress)               |
+-----------------------------------------------------------------------------------+
                                        │
                         Shared Docker Volume Mount (:ro)
                         ./camera-backend/storage/snapshots -> /app/storage/snapshots
                                        │
+-----------------------------------------------------------------------------------+
|                               backend (:8000)                                     |
|                                                                                   |
|  [AI Flood Analysis Pipeline]                                                     |
|          │                                                                        |
|          ▼                                                                        |
|  [CameraStreamService.get_stored_disk_snapshot(camera_id)]                         |
|   - Strictly reads local disk (/app/storage/snapshots/{camera_id}.jpg)            |
|   - Zero HTTP upstream queries during scheduled analysis cycles                   |
|   - If file missing -> log info & skip Gemini inference cleanly                   |
|                                                                                   |
|  [FloodAnalysisService] -> Gemini Vision API -> Database -> Web Clients           |
+-----------------------------------------------------------------------------------+
```

## 2. Component Specifications

### 2.1. `SnapshotCrawlerService` (`camera-backend/app/services/snapshot_crawler.py`)
- **Interval**: Defaults to `600` seconds (10 minutes).
- **Concurrency**: `asyncio.Semaphore(8)`.
- **Worker Flow**:
  1. Acquire camera list from `CatalogService`.
  2. For each camera, fetch snapshot using `HCMCSnapshotHandler` or provider interface.
  3. Validate image using `ImageValidator.is_valid_snapshot()`.
  4. Save valid bytes to disk (`storage_service.save_snapshot()`).
  5. Update progress telemetry (`total`, `success`, `skipped`, `failed`, `last_run_at`, `duration_seconds`).
- **Lifecycle**: Started at FastAPI lifespan start, stopped gracefully on shutdown.

### 2.2. Core Backend Ingestion (`backend/app/services/camera_stream_service.py`)
- Add `storage_only: bool = False` flag to `get_snapshot_bytes()`.
- When `storage_only=True` (used by scheduled flood analysis):
  - Check in-memory cache / disk file.
  - If found and valid: return image bytes.
  - If NOT found: return `None` (or clean synthetic placeholder marked non-analyzable) without making outbound HTTP calls to external servers or `camera-backend`.

### 2.3. Analysis Service Handling (`backend/app/services/flood_analysis_service.py`)
- In `analyze_single_camera`:
  - When invoked from queue/scheduler, call `get_snapshot_bytes(..., storage_only=True)`.
  - If no frame on disk, mark reading as `IMAGE_UNAVAILABLE` or skip gracefully.

## 3. Strict Line Limit Adherence
All new and modified files must remain <= 250 lines of code:
- `camera-backend/app/services/snapshot_crawler.py`: ~160 lines
- `camera-backend/app/main.py`: ~110 lines
- `camera-backend/app/core/config.py`: ~80 lines
- `backend/app/services/camera_stream_service.py`: ~220 lines
- `backend/app/services/flood_analysis_service.py`: ~245 lines
