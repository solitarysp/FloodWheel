# Unit of Work — Automated 30-Minute AI Analysis & Admin Monitor

## UOW-SCAN-001: Background Worker Self-Healing Lifecycle & Resilient Exception Recovery
- **Component**: `FloodAnalysisQueue` (`backend/app/services/flood_queue_service.py`), `AdminRouter` (`backend/app/routers/admin.py`)
- **Objective**: Fix the root cause preventing the background queue from running.
- **Detailed Tasks**:
  1. Update `trigger_now()` so that if `not self._running`: it calls `await self.start()` and initializes the background worker loop.
  2. In `_worker_cycle_loop()`: wrap individual camera processing and queue dequeue operations in strict `try...finally` blocks to guarantee `self._enqueued_ids.discard(cam_id)` and `self._queue.task_done()` execute even upon unexpected exceptions.
  3. In error recovery: if an uncaught loop exception happens, set status to `error`, log diagnostic stack traces, sleep 10s, clear residual queue items/state, and safely re-enter the scheduling cycle.
  4. Ensure `last_cycle_completed_at` and `next_run_at` are accurately set after the final camera in each cycle completes.

---

## UOW-SCAN-002: Cycle Latency Reduction & Fair Rotating Camera Discovery
- **Component**: `FloodAnalysisQueue` (`backend/app/services/flood_queue_service.py`), `FloodAnalysisService` (`backend/app/services/flood_analysis_service.py`), `CameraServiceClient` (`backend/app/services/camera_service_client.py`)
- **Objective**: Accelerate cycle execution by 60–75% and ensure fair coverage across all ~800 traffic cameras.
- **Detailed Tasks**:
  1. Remove the redundant artificial 7-second sleep in `_worker_cycle_loop()`: let `GeminiClient` rate-limiting lock govern API calls; when frames are skipped (default/placeholder) or cached, reduce delay to 0.05s.
  2. Implement fair rotating discovery: in `_discover_all_cameras()`, query local PostgreSQL `Camera` records ordered by `Camera.last_polled_at.asc().nullsfirst()`, filtering out `OFFLINE` status cameras, and capping to `max_cameras_per_cycle`.
  3. Optimize snapshot timeout in `CameraServiceClient`: reduce HTTP timeout from 10.0s to 3.0s connect/read to prevent unresponsive cameras from stalling the pipeline.
  4. Implement `update_queue_config` support for dynamic `max_cameras_per_cycle` and `interval_minutes`.

---

## UOW-SCAN-003: Admin Portal Live Scanning Telemetry & Interactive Controls
- **Component**: `frontend/pages/admin.tsx`
- **Objective**: Build a comprehensive command-and-control monitoring dashboard on `/admin` under the AI Queue tab.
- **Detailed Tasks**:
  1. Create a dynamic scanning telemetry banner:
     - **Active state (`status == 'running'`)**: Animated progress bar (% processed / total), active camera name, ID, district location, and live thumbnail preview.
     - **Idle state (`status == 'idle'`)**: Large monospace countdown clock (`MM:SS`) to next scheduled cycle, target time badge, and last completed cycle summary card (duration, flooded camera count, max depth cm).
     - **Paused state (`status == 'paused'`)**: Amber badge and resume button.
     - **Error state (`status == 'error'`)**: Rose badge, error diagnostics, and one-click restart button.
  2. Add live metric counter chips: Total, Processed, Inundated (Flood Detected), Safe, Skipped, and Failed.
  3. Enhance controls:
     - "Quét Ngay Lập Tức" button with loading spinner.
     - "Tạm Dừng" / "Tiếp Tục" toggle button.
     - "Cấu hình chu kỳ" button opening modal to change interval minutes (5-120m) and batch size (5-50).
  4. Adaptive auto-refresh: Polling `/api/v1/admin/overview` every 3 seconds while active scanning is running, and every 15 seconds when idle.

---

## UOW-SCAN-004: End-to-End Validation & Verification
- **Component**: Full stack (`backend/`, `frontend/`)
- **Objective**: Verify that the automated queue executes reliably, runs fast, rotates cameras properly, and displays real-time telemetry on the admin dashboard.
- **Detailed Tasks**:
  1. Run unit/integration tests for queue scheduling and camera discovery rotation.
  2. Verify manual trigger starts worker and completes 15 cameras within < 60s.
  3. Verify countdown clock updates smoothly and accurately.
  4. Run static lint checks and verify TypeScript compilation in `frontend/`.
