# FloodWheel — User Stories

## Epic 1: Camera Feed Management

### US-001 — Register cameras
**As** a city operator,  
**I want** to register traffic cameras into the FloodWheel system via a YAML/JSON config file,  
**So that** the system knows which feeds to pull and where each camera is located geographically.

**Acceptance Criteria:**
- [ ] Camera config supports: camera_id, name, lat, lng, zone_id, stream_url, mount_height_m, camera_angle
- [ ] Cameras can be registered via file upload or `POST /api/v1/admin/cameras`
- [ ] System validates config on registration and rejects invalid URLs or missing required fields
- [ ] Registered cameras appear in the dashboard camera list with status "PENDING"

**Story Points:** 3 | **Priority:** High

---

### US-002 — Monitor camera health
**As** a city operator,  
**I want** to see which cameras are ONLINE, OFFLINE, or OVERRIDE status on the dashboard,  
**So that** I can identify infrastructure issues and know which data is reliable.

**Acceptance Criteria:**
- [ ] Camera is flagged OFFLINE if no frame is received within 5 consecutive polling intervals
- [ ] Offline cameras are shown with a distinct icon on the map and in the camera list sidebar
- [ ] Dashboard displays last-seen timestamp for each camera
- [ ] Operator receives a dashboard alert when more than 10% of cameras go offline simultaneously

**Story Points:** 3 | **Priority:** Medium

---

### US-003 — Manual depth override
**As** a city operator,  
**I want** to manually override the AI's flood depth reading for any road segment,  
**So that** I can correct inaccurate readings when I have on-the-ground information.

**Acceptance Criteria:**
- [ ] Operator can click any zone on the map, select "Override Depth", set a depth level (0–5), and add a comment
- [ ] Override is displayed on the map with an "OPERATOR OVERRIDE" badge
- [ ] Override lasts for a configurable duration (default 30 minutes) then reverts to AI readings
- [ ] All overrides are logged in the audit trail with operator ID, timestamp, and comment

**Story Points:** 3 | **Priority:** Medium

---

## Epic 2: AI Flood Analysis

### US-004 — Real-time frame analysis
**As** the FloodWheel backend system,  
**I want** to automatically submit camera frames to Gemini Vision API at scheduled intervals,  
**So that** flood depth readings are continuously updated without manual intervention.

**Acceptance Criteria:**
- [ ] Frames are pulled every 60 seconds per camera during active rainfall
- [ ] Each frame is submitted to Gemini 1.5 Flash with the VLRDR prompt
- [ ] Response is validated against FloodReading JSON schema
- [ ] Invalid or unparseable responses are logged and retried up to 3 times
- [ ] API call metrics (latency, cost, success rate) are tracked per camera

**Story Points:** 5 | **Priority:** High

---

### US-005 — Demo image analysis
**As** a hackathon judge or evaluator,  
**I want** to upload 3–5 street photos and see immediate AI flood depth analysis,  
**So that** I can verify the core technology works without needing access to live camera feeds.

**Acceptance Criteria:**
- [ ] Dashboard has a drag-and-drop demo upload area accepting JPEG/PNG/WebP up to 10MB
- [ ] Results are displayed within 3 seconds of upload for up to 5 images
- [ ] Each result shows: depth level badge, depth estimate range (cm), AI reasoning text, and reference objects used
- [ ] Results are shown side-by-side with the uploaded image and highlighted vehicle reference points (if available)

**Story Points:** 5 | **Priority:** High (Demo-critical)

---

### US-006 — Confidence-gated readings
**As** a system administrator,  
**I want** low-confidence AI readings to be flagged as "uncertain" on the map,  
**So that** operators and the public are not misled by unreliable data.

**Acceptance Criteria:**
- [ ] Readings with `confidence_score < 0.5` are displayed with a hatched/transparent overlay on the map
- [ ] Uncertain zones show a "⚠️ Low confidence — insufficient vehicle data" tooltip
- [ ] Uncertain readings are included in aggregation but with 50% reduced weight
- [ ] API response includes `data_quality: "uncertain"` flag for these zones

**Story Points:** 2 | **Priority:** Medium

---

## Epic 3: Flood Heatmap & Visualization

### US-007 — City flood heatmap
**As** a city operator or member of the public,  
**I want** to see a color-coded real-time flood heatmap overlaid on the city map,  
**So that** I can instantly understand which areas are flooded and how severely.

**Acceptance Criteria:**
- [ ] Heatmap displays all registered road zones with color according to the depth level scale (§2.4 of SRS)
- [ ] Heatmap refreshes every 60 seconds on the dashboard without a page reload
- [ ] Zones with no camera coverage appear gray with "No data" label
- [ ] Clicking a zone opens a detail panel showing: depth level, depth cm range, confidence, last updated, camera thumbnails
- [ ] Heatmap is accessible on mobile browsers (responsive layout)

**Story Points:** 8 | **Priority:** High

---

### US-008 — Road segment historical chart
**As** a city operator,  
**I want** to view a 24-hour depth history chart for any road segment,  
**So that** I can understand how flood levels evolved over time and identify recurring flood-prone zones.

**Acceptance Criteria:**
- [ ] Clicking a zone on the map shows a line chart of depth_level over the last 24 hours
- [ ] Chart shows individual camera readings as dots and the aggregated zone reading as a line
- [ ] Operator can expand the time range to 7 days or 30 days
- [ ] Chart can be exported as PNG or CSV

**Story Points:** 5 | **Priority:** Medium

---

### US-009 — GeoJSON API for map data
**As** a third-party developer (e.g., Grab, city GIS team),  
**I want** to access the flood heatmap data as a GeoJSON FeatureCollection via REST API,  
**So that** I can overlay flood data in my own mapping application.

**Acceptance Criteria:**
- [ ] `GET /api/v1/flood/heatmap` returns valid GeoJSON FeatureCollection
- [ ] Each Feature has properties: zone_id, depth_level, depth_estimate_cm_min/max, last_updated, confidence, camera_count
- [ ] Response is cached with `Cache-Control: max-age=300` and returns in < 500ms
- [ ] API is documented in OpenAPI 3.0 spec accessible at `/api/v1/docs`

**Story Points:** 3 | **Priority:** High

---

## Epic 4: Alerts & Notifications

### US-010 — Critical flood alerts
**As** a city emergency responder,  
**I want** to receive an immediate alert when any road zone reaches depth_level ≥ 3,  
**So that** I can pre-position rescue teams before the situation becomes life-threatening.

**Acceptance Criteria:**
- [ ] Alert is triggered within 5 minutes of a zone reaching depth_level ≥ 3
- [ ] Alert is delivered via: dashboard sidebar notification, webhook POST to configured URL, Web Push notification (if subscribed)
- [ ] Alert message includes: road name, depth level, depth estimate (cm), timestamp, and direct link to map
- [ ] Duplicate alerts are suppressed: same zone does not re-alert until it clears and re-floods
- [ ] A "Clear" notification is sent when zone drops back to depth_level ≤ 1

**Story Points:** 5 | **Priority:** High (Safety-critical)

---

### US-011 — Route safety query
**As** a delivery driver integration (via API),  
**I want** to query the flood safety of a planned route by providing origin and destination GPS coordinates,  
**So that** I can warn drivers and suggest alternative safe routes.

**Acceptance Criteria:**
- [ ] `POST /api/v1/route/safety` accepts `{origin: {lat,lng}, destination: {lat,lng}}`
- [ ] Response includes: overall route safety score (0–100), list of road segments on route with depth_level, recommended alternative route if primary has depth_level ≥ 3 segments
- [ ] Response is returned within 1 second
- [ ] API is rate-limited at 1000 requests/minute per API key

**Story Points:** 8 | **Priority:** High

---

## Epic 5: Administration & Cost Management

### US-012 — API cost monitoring
**As** a system administrator,  
**I want** to monitor Gemini API usage and costs in a Grafana dashboard,  
**So that** I can ensure operating costs stay within budget and identify inefficiencies.

**Acceptance Criteria:**
- [ ] Dashboard shows: daily/monthly API call count, estimated cost (USD), average latency per camera
- [ ] Alert is triggered when daily cost exceeds a configured threshold (default: $20/day)
- [ ] Frame skipping is automatically activated when rain sensor / weather API shows no rainfall, reducing calls by ≥ 80%
- [ ] Per-camera cost breakdown is available

**Story Points:** 3 | **Priority:** Medium

---

### US-013 — Privacy: license plate blurring
**As** a city privacy officer,  
**I want** all stored camera frames to have license plates automatically blurred,  
**So that** the system complies with data protection regulations and does not create surveillance risks.

**Acceptance Criteria:**
- [ ] All frames are processed through a license plate detection + blur pipeline before storage
- [ ] Blurring is applied before any frame is stored to disk or passed to Gemini (using only in-memory unblurred frames for AI analysis)
- [ ] System logs a count of blurred plates per processing run for audit purposes
- [ ] Raw (unblurred) frames are never written to persistent storage

**Story Points:** 5 | **Priority:** High (Compliance)

---

## Story Map Summary

| Epic | Stories | Total Points | Priority |
|------|---------|-------------|----------|
| Camera Feed Management | US-001, 002, 003 | 9 | High/Medium |
| AI Flood Analysis | US-004, 005, 006 | 12 | High |
| Flood Heatmap & Viz | US-007, 008, 009 | 16 | High/Medium |
| Alerts & Notifications | US-010, 011 | 13 | High |
| Admin & Cost Mgmt | US-012, 013 | 8 | Medium/High |
| **Total** | **13 stories** | **58 pts** | |
