# FloodWheel — Requirements Analysis

## Project Overview

**FloodWheel** is a real-time urban flood depth mapping system that uses existing traffic camera (CCTV) feeds processed by Gemini Vision AI to estimate flood water depth without physical sensors. The system uses visual landmarks — particularly motorcycle and car wheels — as relative depth references to classify flood severity and generate city-wide heatmaps with routing alerts.

---

## 1. Problem Statement

### 1.1 Core Problem
Urban flooding in Southeast Asian megacities (Hanoi, Ho Chi Minh City, Jakarta, Manila) causes significant economic loss and public safety risk. However, real-time flood depth information is practically unavailable because:

1. **Physical sensors are prohibitively expensive** — underground water sensors cost thousands of USD per unit to install and maintain, and are vulnerable to silt/debris damage.
2. **Traditional Computer Vision fails** — flood water is turbid, lacks clear boundaries, and has no texture for stereo depth estimation.
3. **Crowd-sourced reports are unreliable** — sparse, delayed, and geographically uneven.

### 1.2 Target Cities (Priority Markets)
- **Ho Chi Minh City, Vietnam** — 2,000+ traffic cameras, chronic flooding in Districts 1, 4, 6, 7, 8
- **Hanoi, Vietnam** — 1,000+ cameras, flooding in Cau Giay, Dong Da, Hoan Kiem
- **Jakarta, Indonesia** — ~10,000 cameras, annual catastrophic flooding
- **Manila, Philippines** — flooding during typhoon season

---

## 2. Solution Overview

### 2.1 Core Innovation — Visual Landmark Relative Depth Reasoning (VLRDR)
Instead of measuring water surface depth directly, the system uses **known physical dimensions of vehicles** as calibrated reference objects visible in camera feeds.

### 2.2 Depth Classification Scale

| Level | Visual Indicator | Depth Estimate | Severity | Action |
|-------|-----------------|----------------|----------|--------|
| 0 | No visible water | 0 cm | Safe | Normal traffic |
| 1 | Water on road surface, no wheel contact | < 5 cm | Low | Caution |
| 2 | Water covers 1/3 of motorcycle wheel | 15–20 cm | Moderate | Scooters: caution, motorbikes: okay |
| 3 | Water at exhaust pipe / half wheel | 30–35 cm | High | High stall risk for motorcycles |
| 4 | Water at motorcycle seat / car hood level | 50–70 cm | Critical | Life-threatening |
| 5 | Vehicles fully submerged / swept | > 70 cm | Catastrophic | Emergency |

### 2.3 Reference Calibration Points
- **Standard motorcycle wheel (Honda Wave/Future)**: ~50cm diameter → 1/3 = ~17cm, half = ~25cm
- **Motorbike exhaust pipe height**: ~25–30cm from ground
- **Car tire/wheel arch**: ~35–40cm from ground
- **Car door sill**: ~30cm from ground
- **Car bonnet (hood)**: ~60–70cm from ground

---

## 3. Functional Requirements

### FR-001: Camera Feed Ingestion
- The system SHALL accept JPEG/PNG image frames and MJPEG/RTSP video stream URLs as input
- The system SHALL support batch processing of 50–100 camera feeds simultaneously
- The system SHALL process each camera frame at a configurable interval (default: every 60 seconds during rainfall events)
- The system SHALL store raw frames temporarily for audit and model improvement

### FR-002: Gemini Vision Analysis (Core AI Engine)
- The system SHALL send camera frames to Gemini 1.5 Flash API with a structured prompt for flood depth analysis
- The system SHALL detect the presence and type of vehicles (motorcycle, car, truck, bus) in the frame
- The system SHALL identify flood water contact points on detected vehicles
- The system SHALL output a structured JSON response containing:
  - `camera_id`: string
  - `timestamp`: ISO 8601
  - `flood_detected`: boolean
  - `confidence_score`: float (0.0–1.0)
  - `depth_level`: integer (0–5)
  - `depth_estimate_cm_min`: integer
  - `depth_estimate_cm_max`: integer
  - `reference_objects_used`: list of strings
  - `reasoning`: string (natural language explanation)
  - `alert_message`: string (human-readable warning)
- The system SHALL handle frames with no visible vehicles by returning `confidence_score < 0.3` and `depth_level: null`
- The system SHALL retry failed Gemini API calls up to 3 times with exponential backoff

### FR-003: Flood Depth Aggregation
- The system SHALL aggregate depth readings from multiple cameras in the same geographic zone
- The system SHALL apply a confidence-weighted average when multiple cameras cover the same road segment
- The system SHALL flag a road segment as flooded if at least 2 cameras with confidence > 0.6 report depth_level ≥ 2
- The system SHALL maintain a 30-minute rolling window of readings per camera

### FR-004: Real-Time Heatmap Generation
- The system SHALL generate a city-wide flood heatmap updated every 5 minutes
- The heatmap SHALL use a color scale: Green (safe) → Yellow (caution) → Orange (high risk) → Red (critical) → Purple (catastrophic)
- The heatmap SHALL be served as a GeoJSON FeatureCollection with flood depth properties per road segment
- The system SHALL provide a tile-server-compatible raster heatmap (PNG tiles, z/x/y format)

### FR-005: Alert & Routing API
- The system SHALL expose a REST API for querying flood status by GPS coordinate or road segment ID
- The system SHALL provide route safety scoring: given an origin and destination, score each road segment on the route
- The system SHALL send push notifications to subscribed users when a road segment transitions to depth_level ≥ 3
- The system SHALL integrate with public warning webhooks (configurable endpoints)

### FR-006: Dashboard & Web Map
- The system SHALL provide a web-based dashboard showing the live city flood heatmap
- The dashboard SHALL display camera thumbnail images alongside depth readings
- The dashboard SHALL show historical flood depth charts per camera/road segment (last 24 hours)
- The dashboard SHALL be mobile-responsive for use by emergency responders in the field

### FR-007: Camera Management
- The system SHALL support camera registration via config file (YAML/JSON) with: camera_id, GPS coordinates, stream URL, road segment ID, installation height (meters)
- The system SHALL detect and flag offline cameras (no frame received in 5 minutes)
- The system SHALL support manual depth override by authorized operators

### FR-008: Demo Mode
- The system SHALL support a "demo mode" where static images are submitted for analysis in place of live streams
- Demo mode SHALL produce results within 3 seconds for a batch of 3–5 images

---

## 4. Non-Functional Requirements

### NFR-001: Performance
- Gemini API call latency: < 5 seconds per frame (P95)
- End-to-end pipeline latency (camera frame → heatmap update): < 2 minutes
- API response time for flood status query: < 500ms (P99)
- Dashboard load time: < 3 seconds

### NFR-002: Scalability
- The system SHALL handle 100 concurrent camera feeds
- The system SHALL scale to 1,000 cameras with horizontal scaling (queue-based architecture)
- The system SHALL handle 10,000 concurrent API clients for the public map endpoint

### NFR-003: Availability & Reliability
- System uptime: 99.5% during active rainfall events (critical window)
- Graceful degradation: if Gemini API is unavailable, serve cached data with "data may be stale" flag
- Data durability: flood event logs retained for 90 days

### NFR-004: Accuracy
- Target accuracy: depth level classification within ±1 level compared to physical ground truth (manual measurement)
- Confidence threshold: readings with confidence < 0.5 SHALL be marked as "uncertain" on the map
- False negative rate for depth_level ≥ 3: < 10% (safety-critical — must not miss severe flooding)

### NFR-005: Security
- All camera stream URLs SHALL be stored encrypted at rest
- API access SHALL require authentication (API key or OAuth2)
- Public map endpoint SHALL be rate-limited (100 req/min per IP)
- Gemini API key SHALL never be exposed in client-side code

### NFR-006: Privacy
- Vehicle license plates visible in camera frames SHALL be blurred before any frame is stored or logged
- Only aggregate flood data (not raw frames) SHALL be accessible via the public API

### NFR-007: Cost Efficiency
- Gemini API call cost per city-wide scan (100 cameras): < $0.50
- Use Gemini 1.5 Flash (not Pro) for frame analysis to optimize cost/latency
- Implement frame skipping: only analyze frames when rain sensors or weather API indicates active rainfall

---

## 5. Constraints

### Technical Constraints
- C-001: Camera feeds must be publicly accessible or accessible via city government API (no on-site hardware installation)
- C-002: Gemini API rate limits: must implement request queuing and throttling
- C-003: No proprietary sensor hardware deployment required
- C-004: Must work with existing city CCTV infrastructure (variable image quality, angles, resolutions)

### Business Constraints
- C-005: Must be deployable for a 3-minute demo with static images (hackathon context)
- C-006: Must demonstrate clear cost advantage over sensor-based systems
- C-007: Must be legally compliant with traffic camera data usage regulations per target city

### Environmental Constraints
- C-008: Must function in rain/storm lighting conditions (low light, lens rain drops, partial occlusion)
- C-009: Camera angle variation: some cameras are mounted high (bird's eye view, poor for wheel detection) vs. low (street-level, good for wheel detection)

---

## 6. Stakeholders

| Stakeholder | Role | Needs |
|-------------|------|-------|
| City Traffic Management Center | Primary operator | Real-time overview, historical data, camera management |
| Emergency Response Teams | Secondary operator | Critical alerts, route planning |
| Ride-hailing drivers (Grab, ShopeeFood) | End users | Safe route suggestions, real-time warnings |
| General public / commuters | End users | Map access, road status queries |
| City government IT dept | System integrator | API integration, data access |
| Hackathon judges | Evaluators | Clear demo, innovation clarity |

---

## 7. Assumptions

- A-001: At least 30% of camera frames during flood events will contain visible vehicles
- A-002: City governments will provide camera feed access for a pilot program
- A-003: Gemini 1.5 Flash can reliably identify motorcycle/car wheels and water contact points under rain conditions
- A-004: Standard Vietnamese motorcycle wheel dimensions (Honda Wave/Future/Vision) are representative enough as reference calibration
- A-005: Flood depth is relatively uniform within a 200m road segment

---

## 8. Out of Scope (Version 1.0)

- OOS-001: Real-time traffic video analytics beyond flood detection (vehicle counting, speed, etc.)
- OOS-002: Integration with storm drain / sewage sensor systems
- OOS-003: Flood prediction / forecasting (future: combine with weather API)
- OOS-004: Mobile native apps (iOS/Android) — web PWA only for v1
- OOS-005: Multi-language i18n (English + Vietnamese for v1)
