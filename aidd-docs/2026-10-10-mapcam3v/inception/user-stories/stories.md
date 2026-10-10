# FloodWheel — User Stories & Acceptance Criteria: Camera Map

## Story US-MAP-01: Geographic Camera Exploration
- **As a** commuter checking road conditions,
- **I want** to see all traffic cameras plotted on an interactive map of Ho Chi Minh City,
- **So that** I can intuitively find cameras located along my commute route.

### Acceptance Criteria:
1. Cameras with valid `latitude` and `longitude` are rendered as pins on a Leaflet map.
2. The map defaults to central Ho Chi Minh City (`10.7769, 106.7009`, zoom 12).
3. Search bar and district dropdown filters dynamically update the visible pins on the map.

---

## Story US-MAP-02: Clustered Marker Performance
- **As a** user browsing on mobile or desktop,
- **I want** dense groups of cameras to be clustered into numbered badges,
- **So that** the map remains smooth, responsive, and visually legible.

### Acceptance Criteria:
1. Clusters display the number of cameras in that area.
2. Clicking a cluster zooms into the area and reveals constituent markers.
3. Rendering 800+ cameras maintains 60fps pan/zoom performance.

---

## Story US-MAP-03: On-Demand Snapshot Inspection
- **As a** commuter looking at a specific intersection pin,
- **I want** to click the pin to view its live snapshot and details,
- **So that** I can assess water depth on the roadway.

### Acceptance Criteria:
1. Clicking a marker opens a popup card showing the camera's live snapshot frame, name, district, and status.
2. A refresh button re-fetches the latest frame.
3. An "Analyze with AI" button launches the Gemini Vision VLRDR analysis modal.

---

## Story US-MAP-04: Dual View Toggle
- **As a** user on `/cameras`,
- **I want** to toggle between Map View 🗺️ and Grid View 🔲,
- **So that** I can choose the layout that best fits my current task.

### Acceptance Criteria:
1. Segmented control toggle is visible at the top of `/cameras`.
2. Toggling preserves the active search keyword and district selection.
