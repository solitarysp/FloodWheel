# Requirements Specification - Decoupled Snapshot Crawler & Read-Only Ingestion

## 1. Executive Summary
Decouple camera snapshot acquisition from AI flood analysis. `camera-backend` hosts an automated cyclical crawler running every 10 minutes that retrieves snapshot frames from the HCMC traffic portal with bounded concurrency, validates images, and saves valid frames to persistent disk storage (`storage/snapshots/{camera_id}.jpg`). The core `backend` AI analysis pipeline is modified to read exclusively from these stored files, completely eliminating on-demand upstream requests during AI inference.

## 2. Functional Requirements (FR)

### FR-CAM-001: 10-Minute Periodic Snapshot Crawler in camera-backend
- **FR-CAM-001.1**: The crawler runs asynchronously on a configurable cycle (default `SNAPSHOT_CRAWL_INTERVAL_MINUTES = 10` or `SNAPSHOT_CRAWL_INTERVAL_SECONDS = 600`).
- **FR-CAM-001.2**: Iterates through the current camera catalog (`~800` cameras).
- **FR-CAM-001.3**: Uses bounded concurrency (`asyncio.Semaphore(concurrency=5..10)`) and polite rate pacing to prevent IP blocking from `giaothong.hochiminhcity.gov.vn`.
- **FR-CAM-001.4**: Validates each retrieved frame using `ImageValidator` (rejects synthetic placeholder banners or empty/corrupt files).
- **FR-CAM-001.5**: Upon successful retrieval, immediately writes JPEG bytes to `storage/snapshots/{camera_id}.jpg` and caches in Redis with TTL.
- **FR-CAM-001.6**: Provides crawler telemetry (last run time, duration, success count, failure count, status: IDLE/RUNNING).

### FR-CAM-002: Read-Only Stored Snapshot Pipeline in backend
- **FR-BND-002.1**: When `FloodAnalysisService.analyze_single_camera` or `BatchAnalyzer` is triggered, it directly reads the snapshot image from persistent disk storage (`/app/storage/snapshots/{camera_id}.jpg`).
- **FR-BND-002.2**: The core `backend` NEVER triggers external HTTP network requests to `giaothong.hochiminhcity.gov.vn` or `camera-backend`'s live upstream during AI analysis cycles.
- **FR-BND-002.3**: If a camera has no stored file on disk or the file is older than threshold / invalid:
  - Mark status as `OFFLINE` or `NO_DATA`.
  - Skip AI Gemini call gracefully without throwing exceptions or blocking the queue.
- **FR-BND-002.4**: Admin dashboard and endpoints continue to observe real-time status smoothly based on stored snapshot files.

## 3. Non-Functional Requirements (NFR)
- **NFR-001 (File Line Limit)**: Strict compliance with project rule: each code file must NOT exceed 250 lines (ideal 100-200 lines).
- **NFR-002 (Stability & Resource Consumption)**: Crawler memory usage must remain constant (stream-to-disk or immediate flush, no accumulating unbounded arrays in memory).
- **NFR-003 (Zero Regression)**: All REST endpoints (`/api/v1/cameras`, `/api/v1/flood/queue`, `/api/v1/admin/*`) maintain backward compatibility.
