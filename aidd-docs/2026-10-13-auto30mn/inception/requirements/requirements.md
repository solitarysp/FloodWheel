# Requirements Specification — Automated 30-Minute AI Analysis & Admin Monitor

## 1. Functional Requirements (FR)

### FR-01: Self-Healing Lifecycle & Reliable Background Execution
- **FR-01.1**: The background queue service (`FloodAnalysisQueue`) MUST automatically instantiate and run its worker loop if triggered manually via `/admin/queue/trigger` or `/admin/poll-cycle` when `self._running` is `False`.
- **FR-01.2**: After completing each scanning cycle, the service MUST accurately schedule the subsequent cycle for `cycle_completion_time + interval_seconds` (default 30 minutes, configurable between 5 and 120 minutes).
- **FR-01.3**: The worker loop MUST wrap camera processing and queue dequeue operations in robust `try...finally` blocks to guarantee `_enqueued_ids.discard(camera_id)` and `_queue.task_done()` are invoked even upon unexpected exceptions.
- **FR-01.4**: If unhandled exceptions occur in the loop, the service MUST log detailed diagnostic traces, update its state to `error` with a descriptive message, and automatically recover rather than freezing permanently.

### FR-02: Optimized Cycle Performance & Bounded Concurrency
- **FR-02.1**: The queue worker loop MUST eliminate redundant sleeping (`asyncio.sleep(delay)` after GeminiClient inference) and rely strictly on `GeminiClient` rate-limiting.
- **FR-02.2**: Skipped placeholder / synthetic default frames MUST be filtered with near-zero latency (<= 0.05s) without incurring AI pacing delays.
- **FR-02.3**: Snapshot acquisition for candidate cameras SHOULD support bounded concurrent retrieval (3 to 5 simultaneous HTTP requests with a strict 3.0s timeout per camera) to eliminate network wait bottlenecks.
- **FR-02.4**: Total cycle execution time for 15 cameras with real AI inference MUST NOT exceed 60 seconds under typical network conditions (compared to the previous > 195 seconds).

### FR-03: City-Wide Fair Camera Rotation
- **FR-03.1**: The camera candidate discovery process MUST query cameras ordered by least-recently-polled timestamp (`last_polled_at ASC NULLS FIRST`) from the database, or maintain a revolving cursor across the ~800 cameras.
- **FR-03.2**: Cameras explicitly marked as `OFFLINE` or repeatedly unresponsive MUST be deprioritized so active cameras receive timely flood assessments.

### FR-04: Admin Portal Live Scanning Monitor & Controls
- **FR-04.1**: The Admin Portal (`frontend/pages/admin.tsx`) MUST display a prominent **Live Scanning Telemetry** panel in the AI Queue tab.
- **FR-04.2**: When a cycle is active (`status == 'running'`), the panel MUST display:
  - An animated progress bar showing percentage and processed/total camera count (e.g., `8 / 15 cameras (53%)`).
  - Active camera details: Camera name, ID, district location, and thumbnail snapshot preview.
  - Live category counters: Total, Processed, Inundated (Flood Detected), Safe, Skipped, and Failed.
- **FR-04.3**: When the queue is waiting (`status == 'idle'`), the panel MUST display:
  - A real-time countdown clock counting down seconds and minutes until the next automated run.
  - The exact ISO timestamp / local time of the scheduled next run.
  - A summary card of the last completed run (duration, flooded camera count, max depth cm).
- **FR-04.4**: The Admin Portal MUST provide instant action buttons:
  - **Quét Ngay Lập Tức (Trigger Now)**: Immediately triggers a new scan cycle.
  - **Tạm Dừng / Tiếp Tục (Pause / Resume)**: Allows pausing automated runs during maintenance.
  - **Cấu hình chu kỳ (Configure Interval & Batch Size)**: Allows operators to modify interval minutes and max cameras per cycle on the fly.
- **FR-04.5**: The Admin Portal dashboard MUST auto-refresh telemetry every 3 seconds while active scanning is in progress to ensure smooth real-time progress feedback.

---

## 2. Non-Functional Requirements (NFR)

- **NFR-01: Reliability & Fault Isolation**: An error on any individual camera (e.g. invalid stream, timeout, network failure) must never terminate or block the processing of subsequent cameras in the batch.
- **NFR-02: Quota & Rate Limit Compliance**: The system must never exceed Google Gemini API Free Tier or Pay-as-you-go RPM limits (safely staying below 15 RPM for Free Tier or utilizing multi-key failover).
- **NFR-03: Responsiveness**: Admin UI telemetry endpoints must respond in under 50ms, pulling cached in-memory and Redis queue states without blocking on database locks.
- **NFR-04: Observability**: All queue transitions (start, camera processing, skip, completion, next schedule) must emit structured log messages with cycle IDs and camera metrics.
