# Requirement Verification Questions — Automated 30-Minute AI Analysis & Admin Monitor

## Question 1: Background Worker Self-Activation Lifecycle
How should the system behave when a manual trigger is received (`/admin/queue/trigger`) while the background worker loop is currently stopped (`self._running == False`)?

A) Return an error informing the admin that `FLOOD_QUEUE_AUTO_START` is disabled and require backend restart.
B) Automatically start the background worker (`await self.start()`), launch the cycle immediately, and keep the worker running for future scheduled cycles.
C) Run a one-off batch scan synchronously inside the HTTP endpoint without starting the background worker loop.
X) Other

[Answer]: B
*Rationale: Auto-starting the worker upon operator trigger provides self-healing resiliency without requiring container restarts or editing environment files. This immediately resolves the user's report of the queue being inoperable.*

---

## Question 2: Camera Discovery & City-Wide Fair Rotation Strategy
How should candidate cameras be selected for each 30-minute automated cycle across the ~800 traffic cameras in Ho Chi Minh City?

A) Continue polling the first 15 cameras returned by the catalog service.
B) Rotate cameras dynamically based on least-recently-polled order (`last_polled_at ASC NULLS FIRST`), prioritizing active cameras that have waited the longest while filtering out permanently offline cameras.
C) Pick cameras randomly across all districts on each cycle.
X) Other

[Answer]: B
*Rationale: Selecting cameras by least-recently-polled (`last_polled_at ASC NULLS FIRST`) guarantees fair 100% geographic coverage over recurring cycles, eliminating starvation where only District 1 cameras were ever analyzed.*

---

## Question 3: Cycle Acceleration & Concurrency Model
How should snapshot acquisition and Gemini Vision inference be timed to prevent artificial latency and HTTP 429 quota exhaustion?

A) Keep the current double-sleep mechanism (6s in GeminiClient + 7s in worker loop = 13s per camera).
B) Decouple snapshot retrieval from AI inference: pre-fetch snapshots with bounded concurrency (3-5 concurrent HTTP requests with 3s timeout), eliminate redundant queue-level sleep, and rely strictly on GeminiClient's unified pacing lock (1.5s - 2.0s with multi-key rotation and zero sleep on skipped placeholder images).
C) Run all cameras completely in parallel simultaneously with no rate limits.
X) Other

[Answer]: B
*Rationale: Pre-fetching snapshots concurrently and removing the redundant 7s sleep inside the worker loop reduces per-cycle latency from ~3.5 minutes down to ~30-45 seconds for 15 cameras, while safely preserving Gemini RPM quota limits.*

---

## Question 4: Admin Portal Monitoring Experience
What level of detail should the Admin Portal (`frontend/pages/admin.tsx`) display for active and scheduled scanning?

A) Keep the existing 3 static summary boxes.
B) Provide a live command-and-telemetry control center featuring:
   1. Real-time scanning status badge (Running / Idle / Paused / Error).
   2. Live progress bar (processed / total percentage).
   3. Current camera being scanned (Camera name, ID, district, and live snapshot thumbnail).
   4. Categorized metric badges (Successful, Flooded, Skipped, Failed).
   5. Next run live countdown timer (minutes & seconds remaining) with exact scheduled target time.
   6. Historical summary card of the last completed run (duration, flood count, max depth).
   7. Direct controls (Trigger Now, Pause, Resume, Reconfigure cycle interval & batch size).
C) Only show an alert popup when scanning completes.
X) Other

[Answer]: B
*Rationale: Fulfills the user's explicit request: "Tôi cũng muốn ở màn hình quản trị của admin sẽ show thông tin, trạng thái quét" with high situational awareness and administrative control.*
