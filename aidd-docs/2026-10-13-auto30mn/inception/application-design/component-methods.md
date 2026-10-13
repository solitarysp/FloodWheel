# Component Methods Design — Automated 30-Minute AI Analysis & Admin Monitor

## `FloodAnalysisQueue` Methods

### `async start() -> None`
- Initializes Redis connection (with in-memory fallback).
- Spawns `_loop_task = asyncio.create_task(self._worker_cycle_loop())`.
- Sets `_running = True`, `_paused = False`.

### `async stop() -> None`
- Gracefully cancels `_loop_task` and closes Redis connections.
- Sets `_running = False`, `status = "idle"`.

### `async trigger_now() -> Dict[str, Any]`
- If `not self._running`: calls `await self.start()` to ensure the worker task is alive.
- Unpauses queue if paused (`self._paused = False`).
- Signals `self._wake_event.set()` to interrupt current sleep wait.
- Returns `self.get_status()`.

### `async pause() -> Dict[str, Any]` / `async resume() -> Dict[str, Any]`
- Toggles `self._paused`.
- Syncs state to Redis and returns updated status.

### `async _discover_rotating_cameras() -> List[Dict[str, Any]]`
- Queries local PostgreSQL DB for active cameras ordered by `Camera.last_polled_at.asc().nullsfirst()`.
- Merges remote cameras from `camera-backend`.
- Caps discovery to `max_cameras_per_cycle` (default 15).
- Returns list of camera dictionary payloads.

### `async _worker_cycle_loop() -> None`
- Infinite loop executing:
  1. Discovery of rotating candidates.
  2. Sequential or pre-fetched camera analysis with `try...finally` guarding task completion.
  3. Recording of cycle summary (`duration_seconds`, `flooded_count`, `max_depth_cm`).
  4. Calculation of `next_run_at = cycle_completed_at + timedelta(seconds=self.interval_seconds)`.
  5. Asynchronous wait on `_wake_event` with `timeout=self.interval_seconds` (30 minutes).

### `get_status() -> Dict[str, Any]`
- Computes `next_run_in_seconds = max(0, int((next_run_at - now).total_seconds()))`.
- Returns dictionary containing `is_running`, `status`, `cycle_progress`, `current_camera_id`, `current_camera_name`, `next_run_at`, `next_run_in_seconds`, `last_cycle_summary`, `recent_results`.
