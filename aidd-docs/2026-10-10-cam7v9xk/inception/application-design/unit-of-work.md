# Stage 7: Units Generation — Units of Work Specification

## Detailed Units of Work (UOW)

### UOW-CAM-001: Backend Stream Proxy & Frame Ingestion Service
- **Scope**:
  - Implement `CameraStreamService` in `backend/app/services/camera_stream_service.py`.
  - Add asynchronous `GET /api/v1/cameras/{camera_id}/snapshot` endpoint in `backend/app/routers/cameras.py`.
  - Support in-memory 5-second TTL cache for retrieved frames to prevent redundant external polling.
  - Generate a graceful fallback synthetic JPEG test frame if external stream times out or returns non-200.
- **Estimated Points**: 4 pts
- **Verification Criteria**:
  - `GET /api/v1/cameras/cam-nhc-01/snapshot` returns binary JPEG image bytes with `Content-Type: image/jpeg`.
  - Rapid calls within 5 seconds return cached bytes without invoking external network requests.

---

### UOW-CAM-002: One-Click Camera Snapshot VLRDR Analysis Endpoint
- **Scope**:
  - Implement `POST /api/v1/cameras/{camera_id}/analyze` in `backend/app/routers/cameras.py`.
  - Retrieve current camera frame via `CameraStreamService`.
  - Invoke `GeminiClient.analyze_image_bytes()` with camera's angle and location hint.
  - Parse output with `FloodReadingParser` into `FloodReading` schema.
  - Persist reading in `FloodReadingDB` and update `FloodZone` depth level.
  - Return `AnalysisResponse`.
- **Estimated Points**: 5 pts
- **Verification Criteria**:
  - `POST /api/v1/cameras/cam-nhc-01/analyze` succeeds, returns `reading.depth_level`, `depth_estimate_cm_min`, `depth_estimate_cm_max`, `reference_objects_used`, and `reasoning`.

---

### UOW-CAM-003: Public Camera Registration API & Validation
- **Scope**:
  - Enhance `POST /api/v1/cameras` to allow registering custom camera feeds.
  - Validate that `stream_url` is an HTTP/HTTPS URL and passes a lightweight connection check.
  - Save to PostgreSQL with spatial point geometry.
- **Estimated Points**: 3 pts
- **Verification Criteria**:
  - Successfully registers a new camera; rejects invalid URLs with 400 Bad Request.

---

### UOW-CAM-004: Live Cameras Directory Page & Navigation Integration
- **Scope**:
  - Create `frontend/pages/cameras.tsx` with header, stats (Total Cameras, Online, Monitored Hotspots), and filter bar.
  - Update `frontend/components/Navbar.tsx` to include "Live Cameras" link.
  - Support district filtering and keyword search.
- **Estimated Points**: 4 pts
- **Verification Criteria**:
  - Clicking "Live Cameras" in Navbar navigates to `/cameras`.
  - Displays loaded camera count and filter chips.

---

### UOW-CAM-005: Interactive Camera Card & Auto-Refresh Controls
- **Scope**:
  - Create `frontend/components/CameraCard.tsx`.
  - Render proxied image `<img src="/api/v1/cameras/{id}/snapshot" />` with loading state and error fallback.
  - Implement auto-refresh selector (Manual / 10s / 30s / 60s) with tab backgrounding detection (`document.hidden`).
  - Add individual manual refresh button.
- **Estimated Points**: 4 pts
- **Verification Criteria**:
  - Images refresh automatically according to the selected interval timer.
  - Offline cameras display warning badge and retry trigger.

---

### UOW-CAM-006: Capture & Analyze Action & Detailed Analysis Modal
- **Scope**:
  - Add "📸 Capture & Analyze" button to `CameraCard` with active loading spinner.
  - Create `frontend/components/CameraAnalysisModal.tsx`.
  - Display captured frame side-by-side with VLRDR metrics: Depth level badge (0-5), centimeter range, confidence gauge, landmark chips, vehicle passability icons, and AI reasoning.
- **Estimated Points**: 5 pts
- **Verification Criteria**:
  - Clicking the button triggers backend analysis, disables button, and opens modal upon completion with complete metrics.

---

### UOW-CAM-007: Integration Tests & Full-Stack Verification
- **Scope**:
  - Add backend test cases for snapshot proxy and analyze endpoint in `backend/tests/test_camera_stream.py`.
  - Run AST syntax checks and verify full TypeScript frontend builds without errors.
- **Estimated Points**: 3 pts
- **Verification Criteria**:
  - All test suites pass; zero syntax or runtime errors.
