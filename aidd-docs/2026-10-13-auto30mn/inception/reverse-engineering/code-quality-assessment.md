# Code Quality Assessment — FloodWheel

## Identified Deficiencies & Anti-Patterns

### 1. Inoperable Background Worker when Boot Autostart is Disabled
- **Issue**: `FloodAnalysisQueue` initializes with `self._running = False`. In `main.py`, `start()` is only called if `FLOOD_QUEUE_AUTO_START` is True. In `backend/app/config.py`, this default is `False`.
- **Consequence**: When an operator navigates to `/admin` and clicks "Quét Ngay Lập Tức", `/admin/queue/trigger` invokes `trigger_now()`, which only triggers `self._wake_event.set()`. Because no worker task was ever instantiated (`_loop_task is None`), nothing executes. The UI reports success, but no scanning actually takes place.

### 2. Double Rate-Limit Sleeping (Cumulative Artificial Latency)
- **Issue**: Both `GeminiClient.analyze_image_bytes` (which enforces a 6.0s spacing interval across all calls) and `FloodAnalysisQueue._worker_cycle_loop` (which sleeps `GEMINI_MIN_CALL_INTERVAL_SECONDS + 1.0` = 7.0s after each camera) enforce sleeping.
- **Consequence**: For a batch of 15 cameras, the system sleeps for at least 15 × (6.0 + 7.0) = 195 seconds (over 3.25 minutes) purely waiting on `asyncio.sleep`, even when multi-key rotation and caching are available.

### 3. Starvation via Static Discovery Slice (`cameras[:15]`)
- **Issue**: `_discover_all_cameras()` always slices the first 15 cameras returned by `remote_cams`.
- **Consequence**: The same 15 cameras in District 1 are repeatedly polled every 30 minutes, completely neglecting the remaining ~785 cameras across the metropolitan area.

### 4. Fragile Queue Draining without `try...finally` Protection
- **Issue**: In `_worker_cycle_loop()`, `self._enqueued_ids.discard(cam_id)` and `self._queue.task_done()` are invoked sequentially after `_process_camera()`. If an unexpected error or cancellation occurs before these lines, the camera ID remains in `_enqueued_ids`, permanently preventing that camera from being enqueued in future runs.

### 5. Inadequate Admin UI Scanning Telemetry
- **Issue**: `frontend/pages/admin.tsx` only renders a static 3-item info box and a generic recent results table. It does not display:
  - Total queue size and progress percentage bar (`cycle_progress`).
  - Active scanning camera name, district, or live snapshot preview.
  - Breakdown counters (Success, Flooded, Skipped, Failed).
  - Next scheduled cycle countdown clock (e.g., "24m 15s remaining").
  - Clear error states if the queue failed.
