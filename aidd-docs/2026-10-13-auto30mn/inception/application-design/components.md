# Components Design — Automated 30-Minute AI Analysis & Admin Monitor

## 1. Backend Components

### 1.1 `FloodAnalysisQueue` (`backend/app/services/flood_queue_service.py`)
- **Type**: Async background service / orchestrator singleton.
- **Responsibilities**:
  - Manages worker task lifecycle (`start()`, `stop()`, `pause()`, `resume()`, `trigger_now()`).
  - Automatically boots the worker loop if `trigger_now()` is invoked while stopped.
  - Executes cyclical scheduling: runs cycle -> waits `interval_seconds` (30 min) -> repeats.
  - Queries least-recently-polled cameras from DB / catalog.
  - Maintains live telemetry state (`cycle_progress`, `current_camera_id`, `last_cycle_summary`, `next_run_at`).
  - Syncs state to Redis for multi-worker / multi-process observability.

### 1.2 `FloodAnalysisService` (`backend/app/services/flood_analysis_service.py`)
- **Type**: Domain application service.
- **Responsibilities**:
  - Validates cached readings within TTL.
  - Resolves camera metadata and ensures DB entity existence.
  - Retrieves camera frames via multi-tier stream resolution.
  - Immediately skips default placeholder/synthetic frames without incurring AI delay.
  - Executes Gemini Vision VLRDR analysis.
  - Persists `FloodReadingDB` and updates PostGIS `FloodZone` aggregations.

### 1.3 `AdminRouter` (`backend/app/routers/admin.py`)
- **Type**: FastAPI Router (`/api/v1/admin`).
- **Responsibilities**:
  - Provides `/admin/overview` with live queue status.
  - Handles `/admin/queue/trigger`, `/admin/queue/pause`, `/admin/queue/resume`, and `/admin/queue/config`.

---

## 2. Frontend Components

### 2.1 `QueueTelemetryWidget` (`frontend/pages/admin.tsx`)
- **Type**: React Functional Component inside the AI Queue tab.
- **Responsibilities**:
  - Renders live scan state banner (Running / Idle / Paused / Error).
  - Displays progress bar (% completed, processed/total).
  - Renders active camera thumbnail card with camera details and district.
  - Displays category count badges (Total, Processed, Flooded, Safe, Skipped, Failed).
  - Renders countdown timer (`MM:SS`) to the next scheduled run.
  - Renders summary card of the last completed run.
  - Provides quick action buttons (Quét ngay, Tạm dừng, Tiếp tục, Cấu hình).

### 2.2 `QueueConfigModal` (`frontend/pages/admin.tsx`)
- **Type**: Modal Dialog component.
- **Responsibilities**:
  - Allows operator to view and edit cycle interval (minutes) and max cameras per cycle.
  - Submits updates via `PATCH /api/v1/admin/queue/config` and updates dashboard state.
