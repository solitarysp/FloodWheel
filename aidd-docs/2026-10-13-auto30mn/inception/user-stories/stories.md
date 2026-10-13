# User Stories — Automated 30-Minute AI Analysis & Admin Monitor

## US-SCAN-01: Auto-Recovery & Resilient Lifecycle
- **As a** municipal operations administrator,
- **I want** the automated 30-minute background queue to automatically start and recover if it was initially disabled or stopped,
- **So that** I don't have to restart backend containers or edit environment files just to run flood analysis.
- **Acceptance Criteria**:
  - `POST /admin/queue/trigger` boots the background worker if not currently alive.
  - An isolated camera crash does not abort the queue.
  - Scheduled timers accurately reset to 30 minutes after the cycle finishes.

---

## US-SCAN-02: Fast Cycle Execution & Double-Delay Removal
- **As an** operator,
- **I want** the batch scanning process to execute rapidly without unnecessary artificial delay,
- **So that** the city receives timely flood warnings and stays well within rate limits.
- **Acceptance Criteria**:
  - The redundant 7s sleep inside the queue worker is removed; Gemini pacing is unified.
  - Skipped placeholder/mock frames bypass the AI queue with <= 0.05s delay.
  - Cycle time for 15 cameras drops below 60 seconds.

---

## US-SCAN-03: Fair Rotating Discovery Across All Traffic Cameras
- **As a** commuter and city dispatcher,
- **I want** cameras across all districts to be scanned over sequential 30-minute intervals,
- **So that** flood information is not limited to just District 1 and the whole city is covered.
- **Acceptance Criteria**:
  - Camera candidate selection orders by `last_polled_at ASC NULLS FIRST`.
  - Offline/permanently unavailable cameras are filtered or deprioritized.

---

## US-SCAN-04: Live Scanning Monitor & Telemetry on Admin Portal
- **As a** system operator,
- **I want** to see live scanning progress, current camera thumbnail, categorized counts, and next-run countdown on `/admin`,
- **So that** I have full operational visibility and confidence in the system's automated operation.
- **Acceptance Criteria**:
  - Active scanning shows an animated progress bar (processed/total %), current camera name, district, and thumbnail preview.
  - Idle state displays a live countdown timer (`MM:SS`) to the next scheduled run and the summary of the last completed run.
  - Interactive buttons allow immediate triggering, pausing, resuming, and modifying configuration on the fly.
