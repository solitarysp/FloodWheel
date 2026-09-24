# FloodWheel — Component Design

## Architecture Pattern
**Layered Microservice Architecture** with async task processing

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
│   Next.js Dashboard (SSR/PWA) │ Mapbox GL JS │ Demo Upload UI  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS REST / WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│                       API GATEWAY LAYER                         │
│            FastAPI (Python) — REST API + WebSocket              │
│         Auth Middleware │ Rate Limiter │ OpenAPI Docs            │
└─────┬──────────────┬───────────────┬──────────────┬────────────┘
      │              │               │              │
┌─────▼──┐    ┌──────▼─────┐  ┌─────▼─────┐  ┌────▼──────────┐
│Ingestion│   │  AI Engine  │  │Aggregation│  │ Alert Engine  │
│Service  │   │  Service    │  │ Service   │  │ Service       │
└─────┬──┘    └──────┬─────┘  └─────┬─────┘  └────┬──────────┘
      │              │               │              │
┌─────▼──────────────▼───────────────▼──────────────▼──────────┐
│                      DATA LAYER                               │
│    PostgreSQL + PostGIS  │  Redis Cache  │  Object Storage   │
└───────────────────────────────────────────────────────────────┘
                              │
                     ┌────────▼────────┐
                     │  EXTERNAL APIs  │
                     │  Gemini Vision  │
                     │  Weather API    │
                     │  Mapbox Tiles   │
                     └────────────────┘
```

---

## Component Inventory

### C-001: Ingestion Service
**Language:** Python  
**Responsibility:** Pull frames from all registered cameras on schedule, apply privacy filter, store to temp storage, enqueue for AI processing.

**Sub-components:**
- `FramePuller` — Async HTTP/RTSP frame fetcher per camera
- `PollingScheduler` — Dynamic interval scheduler (integrates with Weather API)
- `PrivacyFilter` — License plate detection (PaddleOCR) + blur (OpenCV)
- `FrameQueue` — Redis Streams producer for AI pipeline

**Key Methods:**
```python
async def pull_frame(camera: Camera) -> Frame
async def schedule_polling(city_id: str) -> None
def blur_license_plates(frame: Frame) -> Frame
async def enqueue_frame(frame: Frame) -> None
```

**Dependencies:** Redis (queue), PostgreSQL (camera registry), Weather API

---

### C-002: AI Engine Service
**Language:** Python  
**Responsibility:** Consume frames from queue, submit to Gemini Vision API with VLRDR prompt, validate and persist FloodReading results.

**Sub-components:**
- `GeminiClient` — Wrapper around Google Gemini Python SDK; handles auth, retries, rate limiting
- `VLRDRPromptBuilder` — Assembles structured multi-part prompt (system instructions + calibration table + image)
- `FloodReadingParser` — Validates Gemini JSON response against FloodReading schema
- `ReadingRepository` — Persists FloodReading to PostgreSQL

**Key Methods:**
```python
async def analyze_frame(frame: Frame) -> FloodReading
def build_vlrdr_prompt(camera_angle: str) -> str
def parse_gemini_response(raw: str) -> FloodReading
async def save_reading(reading: FloodReading) -> None
```

**Dependencies:** Gemini API (external), PostgreSQL, Redis (queue consumer)

---

### C-003: Aggregation Service
**Language:** Python  
**Responsibility:** Aggregate per-camera FloodReadings into zone-level assessments using confidence weighting and rolling time windows.

**Sub-components:**
- `ZoneAggregator` — Computes zone-level depth_level from N camera readings
- `ConfidenceWeighter` — Applies time decay and camera_angle confidence adjustments
- `HeatmapBuilder` — Generates GeoJSON FeatureCollection from zone aggregates
- `TileRenderer` — Converts GeoJSON to raster PNG tiles (z/x/y)
- `ZoneRepository` — Reads/writes zone aggregates to PostgreSQL

**Key Methods:**
```python
def aggregate_zone(zone_id: str, readings: list[FloodReading]) -> ZoneStatus
def apply_time_decay(reading: FloodReading, age_minutes: float) -> float
def build_geojson(zones: list[ZoneStatus]) -> FeatureCollection
async def render_tiles(geojson: FeatureCollection) -> None
```

**Dependencies:** PostgreSQL + PostGIS, Redis (cache for GeoJSON output)

---

### C-004: Alert Engine Service
**Language:** Python  
**Responsibility:** Monitor zone status transitions, fire alerts on threshold crossings, deliver via webhook and Web Push.

**Sub-components:**
- `ThresholdMonitor` — Watches ZoneStatus changes; detects depth_level transitions
- `DeduplicationGuard` — Prevents re-alerting until zone clears and re-floods
- `WebhookDelivery` — HTTP POST to configured webhook URLs with retry
- `PushNotificationSender` — Web Push API delivery via VAPID keys

**Key Methods:**
```python
async def check_zone_transition(zone_id: str, old: ZoneStatus, new: ZoneStatus) -> None
def should_alert(zone_id: str, new_level: int) -> bool
async def send_webhook(endpoint: str, payload: AlertPayload) -> None
async def send_push(subscription: PushSubscription, payload: AlertPayload) -> None
```

**Dependencies:** PostgreSQL (zone history, subscriptions), Redis (deduplication state)

---

### C-005: REST API (FastAPI App)
**Language:** Python + FastAPI  
**Responsibility:** Expose all public and authenticated endpoints; serve as the integration point for frontend and third-party apps.

**Sub-components:**
- `FloodRouter` — `/api/v1/flood/*` endpoints
- `RouteRouter` — `/api/v1/route/*` endpoints
- `CameraRouter` — `/api/v1/cameras`, `/api/v1/admin/cameras` endpoints
- `AnalyzeRouter` — `/api/v1/analyze` (demo upload endpoint)
- `AuthMiddleware` — API key validation
- `RateLimiter` — Redis-backed per-IP rate limiting

**Key Endpoints:**
```
GET  /api/v1/flood/status?lat=&lng=&radius=
GET  /api/v1/flood/zone/{zone_id}
GET  /api/v1/flood/heatmap
POST /api/v1/analyze
POST /api/v1/route/safety
GET  /api/v1/cameras
POST /api/v1/admin/cameras
```

**Dependencies:** All services (via direct module calls or HTTP), Redis (rate limiting, cache)

---

### C-006: Web Frontend (Next.js)
**Language:** TypeScript + React + Next.js  
**Responsibility:** Operator dashboard, public flood map, demo upload interface.

**Sub-components:**
- `FloodMap` — Mapbox GL JS map with GeoJSON heatmap overlay + zone click handlers
- `ZoneDetailPanel` — Sidebar panel with depth info, camera thumbnails, 24h chart
- `AlertSidebar` — Live list of active critical alerts (WebSocket feed)
- `DemoUpload` — Drag-and-drop image uploader with AI result cards
- `CameraGrid` — Camera status management grid (operator only)
- `AuthGate` — Role-based route protection (public map vs. operator dashboard)

**Dependencies:** FloodWheel REST API, Mapbox GL JS, Chart.js (history charts), SWR (data fetching)

---

### C-007: Database Schema (PostgreSQL + PostGIS)
**Key Tables:**

```sql
cameras (
  camera_id TEXT PK,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  zone_id TEXT FK,
  stream_url_encrypted TEXT,
  mount_height_m FLOAT,
  camera_angle TEXT CHECK (IN ('street_level','elevated','overhead')),
  status TEXT CHECK (IN ('ONLINE','OFFLINE','OVERRIDE','DISABLED')),
  last_seen_at TIMESTAMPTZ
)

flood_zones (
  zone_id TEXT PK,
  name TEXT,
  geom GEOMETRY(LineString, 4326),  -- PostGIS road segment geometry
  city_id TEXT,
  depth_level INT,
  depth_cm_min INT,
  depth_cm_max INT,
  confidence FLOAT,
  camera_count INT,
  last_updated_at TIMESTAMPTZ
)

flood_readings (
  id BIGSERIAL PK,
  camera_id TEXT FK,
  timestamp TIMESTAMPTZ,
  flood_detected BOOLEAN,
  confidence_score FLOAT,
  depth_level INT,
  depth_cm_min INT,
  depth_cm_max INT,
  reference_objects TEXT[],
  reasoning TEXT,
  alert_message TEXT
)

alerts (
  id BIGSERIAL PK,
  zone_id TEXT FK,
  triggered_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  depth_level INT,
  delivery_status JSONB
)

operator_overrides (
  id BIGSERIAL PK,
  zone_id TEXT FK,
  operator_id TEXT,
  depth_level INT,
  comment TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
```
