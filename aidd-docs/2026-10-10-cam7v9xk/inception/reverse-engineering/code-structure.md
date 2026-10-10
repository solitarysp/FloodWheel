# Stage 2: Reverse Engineering — Code Structure

## Codebase Structure & Camera Extension Touchpoints

### Backend (`backend/`)
- `app/models/camera.py`:
  - `CameraBase`, `CameraCreate`, `CameraUpdate`, `CameraResponse` schemas.
  - *Extension*: Add `last_snapshot_url`, `snapshot_interval_seconds` if required.
- `app/models/db_models.py`:
  - `Camera` SQLAlchemy ORM model linked to `FloodZone`.
  - Holds `stream_url`, `status`, `last_ping`, `camera_angle`.
- `app/services/camera_registry.py`:
  - Camera retrieval and status update operations.
  - *Extension*: Add `fetch_camera_frame(camera_id)` via `httpx.AsyncClient`.
- `app/routers/cameras.py`:
  - `GET /cameras`, `GET /cameras/{camera_id}`, `POST /cameras/admin`.
  - *Extension*:
    - `GET /cameras/{camera_id}/snapshot`: Fetch and stream binary image bytes with proper headers.
    - `POST /cameras/{camera_id}/analyze`: Fetch frame, analyze with Gemini VLRDR, update zone, return `AnalysisResponse`.
    - `POST /cameras`: Allow registration of new public camera URLs with validation.
- `app/db/seed_data.py`:
  - Pre-seeded with 5 municipal CCTV cameras (`cam-nhc-01`, `cam-nhc-02`, `cam-vvn-01`, `cam-qh-01`, `cam-ll-01`).

### Frontend (`frontend/`)
- `pages/cameras.tsx` *[NEW]*:
  - Dedicated Public Cameras monitoring view.
  - Header with total cameras count, online count, district filter, and "Add Public Camera" action.
  - Grid of interactive `CameraCard` items.
- `components/CameraCard.tsx` *[NEW]*:
  - Live/periodic snapshot view (`<img src="/api/v1/cameras/{id}/snapshot?t=..." />`).
  - Refresh toggle (Manual, 10s, 30s).
  - Status pill (`ONLINE`, `DEGRADED`, `OFFLINE`).
  - "📸 Capture & Analyze" button with spinner.
  - Direct display of latest flood analysis tag.
- `components/CameraAnalysisModal.tsx` *[NEW]*:
  - Visual display of analyzed frame, detected landmark tags, depth gauge (cm min-max), vehicle passability badges, and raw AI reasoning.
- `components/Navbar.tsx`:
  - Add navigation link to `Live Cameras (/cameras)`.
- `pages/dashboard.tsx`:
  - Add Quick Cameras summary widget and navigation CTA to `/cameras`.
