# Stage 3: Requirements Analysis — Requirements Specification

## 1. Functional Requirements (FR)

### FR-CAM-01: Public Camera Directory & Filtering
- The system shall provide a dedicated Live Cameras page (`/cameras`) displaying all registered municipal traffic cameras.
- The directory shall support filtering cameras by District (`District 1`, `Binh Thanh`, `Thu Duc City`), Zone, and Operating Status (`ONLINE`, `DEGRADED`, `OFFLINE`).
- The directory shall display camera metadata including Camera Code, Name, Location, Camera Angle, and Zone Name.

### FR-CAM-02: Live Snapshot Ingestion & Asynchronous Proxy
- The system shall provide an asynchronous snapshot proxy endpoint (`GET /api/v1/cameras/{id}/snapshot`) using HTTPX.
- The proxy shall stream camera frames directly to the frontend with appropriate CORS headers (`Access-Control-Allow-Origin: *`) and caching headers (`Cache-Control: public, max-age=5`).
- The proxy shall gracefully handle network errors or offline cameras by returning a standardized placeholder or 504 Gateway Timeout status.

### FR-CAM-03: Live Feed Refresh Controls
- The frontend camera viewer shall support configurable auto-refresh intervals: `Manual (Off)`, `10 seconds`, `30 seconds`, and `60 seconds`.
- Each camera card shall include an individual manual refresh button to fetch the latest frame on demand.
- A visual timestamp badge shall indicate when the current frame was captured.

### FR-CAM-04: One-Click Camera Snapshot AI Analysis
- Each camera card shall include a prominent **"📸 Capture & Analyze"** button.
- When clicked:
  1. The client invokes `POST /api/v1/cameras/{id}/analyze`.
  2. The backend fetches the current image frame directly from `stream_url`.
  3. The backend invokes `GeminiClient` with the camera's registered `camera_angle` and `location_hint`.
  4. The response generates full VLRDR reasoning, depth level (0–5), estimated centimeter bounds (`depth_cm_min`, `depth_cm_max`), physical landmarks used, and vehicle passability ratings.
  5. The reading is persisted to `FloodReadingDB` and immediately updates the associated `FloodZone` state.

### FR-CAM-05: Detailed AI Analysis Inspection Modal
- Upon completion of analysis, an interactive modal (`CameraAnalysisModal`) shall open displaying:
  - The exact captured camera image frame.
  - Calculated Flood Depth Level (0 to 5) with color-coded severity.
  - Centimeter depth range (e.g. `30–40 cm`).
  - Visual landmark tags detected (e.g. `Motorcycle wheel 1/2 submerged`, `Curb submerged`).
  - Vehicle Passability Matrix (Motorcycles, Sedans, SUVs, Trucks).
  - Detailed Gemini Vision reasoning narrative.
  - Active Public Advisory message.

### FR-CAM-06: Custom Public Camera Stream Registration
- The platform shall allow operators to register new public camera streams via an "Add Public Camera" modal.
- Required fields: Camera Name, Location description, GPS Coordinates (Latitude, Longitude), Camera Angle (`street_level`, `elevated`, `overhead`), Stream URL, and Monitored Flood Zone.
- The system shall validate the stream URL by performing a preliminary HTTP fetch before saving to the database.

---

## 2. Non-Functional Requirements (NFR)

### NFR-CAM-01: Performance & Latency
- Camera snapshot proxying shall add less than 150ms overhead over external source latency.
- Snapshot AI inference via Gemini Vision shall complete within 1.5 seconds under standard network conditions.

### NFR-CAM-02: Resilience & Fault Tolerance
- A failure or timeout in an individual public camera feed shall not block or degrade other camera feeds or system functions.
- If an external camera stream becomes unreachable, the status shall automatically display `OFFLINE` with a retry mechanism.

### NFR-CAM-03: Bandwidth Optimization & Caching
- Proxied snapshot frames shall leverage a 5-second in-memory / HTTP cache to prevent spamming municipal camera servers.
- Auto-refresh timers shall pause automatically when the browser tab is hidden or backgrounded (`document.hidden`).

### NFR-CAM-04: Security & URL Validation
- Registered camera stream URLs must be restricted to valid HTTP/HTTPS schemes to prevent Server-Side Request Forgery (SSRF) against private internal network ranges.
