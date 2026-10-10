# Stage 4: User Stories — User Stories & Acceptance Criteria

## US-CAM-001: Live Public Camera Directory & Filtering
**As a** municipal monitoring operator or commuter,  
**I want to** browse a responsive directory of public traffic CCTV cameras filtered by district and operating status,  
**So that** I can easily inspect critical street locations during severe storms.

### Acceptance Criteria:
- **Given** an operator navigating to `/cameras`,
- **When** the page loads,
- **Then** all registered public cameras are fetched from `/api/v1/cameras` and presented in a responsive card grid showing camera name, location, angle, and operating status.
- **When** the operator filters by "Binh Thanh" or "Thu Duc City",
- **Then** only cameras belonging to that district are shown.

---

## US-CAM-002: Live Snapshot Streaming with Auto-Refresh
**As an** operator,  
**I want to** view live snapshot feeds from public cameras with customizable auto-refresh intervals,  
**So that** I can observe rising floodwaters in near real time without manually refreshing the browser.

### Acceptance Criteria:
- **Given** a camera card on `/cameras`,
- **When** rendered,
- **Then** the image loads via the proxied snapshot URL (`/api/v1/cameras/{id}/snapshot`) with a last-updated timestamp.
- **When** the user selects "Auto-Refresh: 10s",
- **Then** all camera snapshot images update every 10 seconds with cache-busting timestamps.
- **When** the browser tab is switched or minimized,
- **Then** auto-refresh automatically pauses to conserve network bandwidth.

---

## US-CAM-003: One-Click "Capture & Analyze" Flood Depth Analysis
**As a** flood management operator,  
**I want to** click a "Capture & Analyze" button on any active camera feed,  
**So that** Gemini Vision VLRDR immediately analyzes the current frame, estimates water depth in centimeters, and detects flood severity.

### Acceptance Criteria:
- **Given** an active camera card on `/cameras`,
- **When** the operator clicks "📸 Capture & Analyze",
- **Then** a loading spinner appears on the card and invokes `POST /api/v1/cameras/{id}/analyze`.
- **Then** the backend acquires the latest frame from the camera stream, runs Gemini VLRDR analysis, records the reading in `FloodReadingDB`, and updates the zone depth level.
- **Then** a detailed result modal (`CameraAnalysisModal`) opens displaying the analyzed frame, estimated depth level (0–5), centimeter range (min-max), identified landmarks, vehicle passability icons, and AI reasoning.

---

## US-CAM-004: Register Custom Public Camera Feed
**As a** traffic systems administrator,  
**I want to** add a new public camera stream URL with geographic and angle parameters,  
**So that** the system can monitor additional neighborhood streets without backend code changes.

### Acceptance Criteria:
- **Given** an administrator on `/cameras`,
- **When** clicking "Add Public Camera",
- **Then** a modal opens requesting Camera ID, Name, Location, Latitude/Longitude, Camera Angle (`street_level`, `elevated`, `overhead`), Stream URL, and Zone ID.
- **When** submitting the form,
- **Then** the backend validates connectivity to the stream URL before persisting the new camera to PostgreSQL.
- **Then** the newly registered camera immediately appears in the Live Cameras directory and can be analyzed.
