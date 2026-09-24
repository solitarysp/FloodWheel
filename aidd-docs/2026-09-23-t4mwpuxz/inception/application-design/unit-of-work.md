# FloodWheel — Units of Work

## Overview
58 story points decomposed into 26 atomic implementation units across 3 phases.

---

## Phase 1 — Core AI Engine & Hackathon Demo (Week 1–2)

### UOW-001: Project Scaffold
**Type:** Infrastructure  
**Est:** 0.5 day  
**Description:** Initialize monorepo structure, Docker Compose config (backend, frontend, postgres, redis), environment variable schema, and CI/CD skeleton.

**Deliverables:**
- `docker-compose.yml` with all services
- `backend/` (FastAPI app skeleton)
- `frontend/` (Next.js app skeleton)
- `.env.example` with all required variables
- `Makefile` with `make dev`, `make test`, `make build`

**Dependencies:** None  
**Stories:** —

---

### UOW-002: Gemini Vision Client
**Type:** Backend — AI Integration  
**Est:** 1 day  
**Description:** Implement `GeminiClient` class wrapping the Google Generative AI Python SDK with: authentication, retry logic (3x exponential backoff), request/response logging, and token usage tracking.

**Deliverables:**
- `backend/app/services/gemini_client.py`
- Unit tests with mocked Gemini responses
- Environment config: `GEMINI_API_KEY`, `GEMINI_MODEL`

**Dependencies:** UOW-001  
**Stories:** US-004

---

### UOW-003: VLRDR Prompt Builder
**Type:** Backend — AI Integration  
**Est:** 0.5 day  
**Description:** Implement `VLRDRPromptBuilder` that generates the structured Gemini multi-part prompt including system instructions, the vehicle calibration reference table, and camera angle adjustments.

**Deliverables:**
- `backend/app/services/vlrdr_prompt.py`
- Prompt templates for: street_level, elevated, overhead camera angles
- Unit tests verifying prompt structure

**Dependencies:** UOW-002  
**Stories:** US-004

---

### UOW-004: FloodReading Schema & Validation
**Type:** Backend — Data Model  
**Est:** 0.5 day  
**Description:** Define `FloodReading` Pydantic model + JSON schema validation. Implement `FloodReadingParser` to parse and validate Gemini responses.

**Deliverables:**
- `backend/app/models/flood_reading.py` (Pydantic model)
- `backend/app/schemas/flood_reading_schema.json`
- `backend/app/services/flood_reading_parser.py`
- Unit tests for valid/invalid/partial Gemini responses

**Dependencies:** UOW-003  
**Stories:** US-004, US-006

---

### UOW-005: Demo Analyze Endpoint
**Type:** Backend — API  
**Est:** 1 day  
**Description:** Implement `POST /api/v1/analyze` endpoint accepting image uploads (multipart form), calling Gemini, and returning structured FloodReading JSON. No database persistence needed for demo mode.

**Deliverables:**
- `backend/app/routers/analyze.py`
- Max 5 images per request; max 10MB per image
- Error handling: unsupported format, Gemini failure, timeout

**Dependencies:** UOW-004  
**Stories:** US-005

---

### UOW-006: Demo Frontend Panel
**Type:** Frontend  
**Est:** 1.5 days  
**Description:** Build the `DemoUpload` React component: drag-and-drop image upload, loading state, and `ResultCard` components showing depth level badge, cm estimate, AI reasoning, and reference objects used.

**Deliverables:**
- `frontend/components/DemoUpload.tsx`
- `frontend/components/ResultCard.tsx`
- `frontend/pages/demo.tsx`
- Responsive layout; results displayed in < 3s

**Dependencies:** UOW-005  
**Stories:** US-005

---

### UOW-007: Sample Flood Images & Demo Script
**Type:** Content / QA  
**Est:** 0.5 day  
**Description:** Curate 3–5 representative flood images (different severity levels) for the hackathon demo. Document the expected AI output for each.

**Deliverables:**
- `demo-assets/images/` — 3–5 annotated flood images
- `demo-assets/expected-output.json` — expected FloodReading for each
- Demo script (`demo-assets/demo-script.md`) for presenter

**Dependencies:** UOW-006  
**Stories:** US-005

---

## Phase 2 — Live Infrastructure & Heatmap (Week 3–5)

### UOW-008: Database Schema & Migrations
**Type:** Infrastructure — Data  
**Est:** 1 day  
**Description:** Set up PostgreSQL + PostGIS. Create all tables (cameras, flood_zones, flood_readings, alerts, operator_overrides) with Alembic migrations.

**Deliverables:**
- `backend/alembic/` migration files
- PostGIS extension setup
- Seed data: sample zone geometries for HCMC pilot

**Dependencies:** UOW-001  
**Stories:** —

---

### UOW-009: Camera Registry Module
**Type:** Backend — Data  
**Est:** 1 day  
**Description:** Implement `Camera` model, `CameraRepository`, and YAML/JSON config loader for bulk camera registration. Implement `POST /api/v1/admin/cameras` and `GET /api/v1/cameras` endpoints.

**Deliverables:**
- `backend/app/models/camera.py`
- `backend/app/services/camera_registry.py`
- `backend/app/routers/cameras.py`
- Config loader: `backend/app/config/camera_config_loader.py`

**Dependencies:** UOW-008  
**Stories:** US-001, US-002

---

### UOW-010: Async Frame Puller
**Type:** Backend — Ingestion  
**Est:** 2 days  
**Description:** Implement `FramePuller` with async HTTP client (httpx) for snapshot URLs and RTSP capture (cv2/ffmpeg). Camera health monitoring: mark OFFLINE after 5 failed polls.

**Deliverables:**
- `backend/app/services/frame_puller.py`
- Support: HTTPS JPEG snapshot, RTSP stream (1 frame per poll)
- Camera status update logic (ONLINE / OFFLINE transitions)
- Integration tests with mock HTTP server

**Dependencies:** UOW-009  
**Stories:** US-002, US-004

---

### UOW-011: Privacy Filter (License Plate Blur)
**Type:** Backend — Privacy  
**Est:** 1.5 days  
**Description:** Implement `PrivacyFilter` using PaddleOCR for license plate detection + OpenCV Gaussian blur. Process frames in-memory; never write unblurred frames to disk.

**Deliverables:**
- `backend/app/services/privacy_filter.py`
- Unit tests with sample plates (Vietnamese format)
- Performance benchmark: must complete in < 500ms per frame

**Dependencies:** UOW-010  
**Stories:** US-013

---

### UOW-012: Redis Task Queue (ARQ)
**Type:** Backend — Infrastructure  
**Est:** 1 day  
**Description:** Set up ARQ (async Redis queue) for decoupled camera polling. `PollingScheduler` enqueues `analyze_frame` jobs per camera. `AIEngineWorker` processes queue.

**Deliverables:**
- `backend/app/workers/` — ARQ worker definitions
- `backend/app/services/polling_scheduler.py`
- Worker health monitoring endpoint

**Dependencies:** UOW-011, UOW-004  
**Stories:** US-004

---

### UOW-013: Weather API Integration
**Type:** Backend — Integration  
**Est:** 0.5 day  
**Description:** Integrate Open-Meteo API to query rainfall rate. If rainfall > 10mm/hour → polling every 30s. If no rainfall → polling every 300s.

**Deliverables:**
- `backend/app/services/weather_client.py`
- Dynamic scheduler update logic
- Fallback: default 60s polling if weather API unavailable

**Dependencies:** UOW-012  
**Stories:** US-004

---

### UOW-014: Flood Data Aggregation Engine
**Type:** Backend — Core Logic  
**Est:** 1.5 days  
**Description:** Implement `ZoneAggregator` with confidence-weighted median, time decay, and camera_angle adjustments. Persist `ZoneStatus` to PostgreSQL after each aggregation run.

**Deliverables:**
- `backend/app/services/zone_aggregator.py`
- `backend/app/models/zone_status.py`
- Aggregation runs every 5 minutes via scheduled task
- Unit tests for edge cases (no readings, all uncertain, mixed levels)

**Dependencies:** UOW-008, UOW-004  
**Stories:** US-006

---

### UOW-015: GeoJSON Heatmap Builder
**Type:** Backend — Output  
**Est:** 1.5 days  
**Description:** Implement `HeatmapBuilder` generating GeoJSON FeatureCollection from current zone statuses. Cache output in Redis (TTL: 5 minutes). Serve via `GET /api/v1/flood/heatmap`.

**Deliverables:**
- `backend/app/services/heatmap_builder.py`
- `backend/app/routers/flood.py` — heatmap endpoint
- Redis caching with ETag-based cache invalidation

**Dependencies:** UOW-014, UOW-008  
**Stories:** US-007, US-009

---

### UOW-016: Flood Status API Endpoints
**Type:** Backend — API  
**Est:** 1 day  
**Description:** Implement remaining flood query endpoints: `GET /flood/status?lat=&lng=&radius=` (PostGIS spatial query) and `GET /flood/zone/{zone_id}` with 24h history.

**Deliverables:**
- Complete `backend/app/routers/flood.py`
- PostGIS spatial query for nearest zones
- Response < 500ms P99

**Dependencies:** UOW-015  
**Stories:** US-007, US-008, US-009

---

### UOW-017: Operator Dashboard — Map View
**Type:** Frontend  
**Est:** 2 days  
**Description:** Main dashboard page with Mapbox GL JS map, GeoJSON heatmap overlay (auto-refresh every 60s), zone click handler, and camera status icons.

**Deliverables:**
- `frontend/components/FloodMap.tsx`
- `frontend/components/CameraMarker.tsx`
- `frontend/pages/dashboard.tsx`
- Auto-refresh via SWR with 60s revalidation

**Dependencies:** UOW-015 (API), UOW-016  
**Stories:** US-007

---

### UOW-018: Zone Detail Panel
**Type:** Frontend  
**Est:** 1.5 days  
**Description:** Sidebar panel showing zone details on click: depth level badge, cm range, confidence, camera thumbnails, 24h Chart.js line chart, and override button (operator only).

**Deliverables:**
- `frontend/components/ZoneDetailPanel.tsx`
- `frontend/components/DepthHistoryChart.tsx`
- Role-based rendering (public vs. operator)

**Dependencies:** UOW-017, UOW-016  
**Stories:** US-007, US-008

---

### UOW-019: Manual Override Feature
**Type:** Backend + Frontend  
**Est:** 1 day  
**Description:** Operator override: POST to `PUT /api/v1/admin/zones/{zone_id}/override`, persists to `operator_overrides` table, auto-expires after configured duration, shown on map with badge.

**Deliverables:**
- `backend/app/routers/admin.py` — override endpoint
- `frontend/components/OverrideDialog.tsx`
- Override badge on FloodMap zone layer

**Dependencies:** UOW-017, UOW-008  
**Stories:** US-003

---

### UOW-020: API Authentication Middleware
**Type:** Backend — Security  
**Est:** 0.5 day  
**Description:** Implement `X-API-Key` header authentication for all non-public endpoints. Key management via environment config.

**Deliverables:**
- `backend/app/middleware/auth.py`
- Public vs. authenticated endpoint routing configuration
- Integration tests for auth failure/success cases

**Dependencies:** UOW-005  
**Stories:** US-009

---

## Phase 3 — Alerts, Routing & Scale (Week 6–8)

### UOW-021: Alert Engine — Threshold Monitor
**Type:** Backend — Core Logic  
**Est:** 1.5 days  
**Description:** Implement `ThresholdMonitor` that compares previous and current ZoneStatus after each aggregation run. Trigger alert when depth_level crosses ≥ 3. Implement `DeduplicationGuard` using Redis set.

**Deliverables:**
- `backend/app/services/threshold_monitor.py`
- `backend/app/services/dedup_guard.py`
- Alert model + `alerts` table writes

**Dependencies:** UOW-014  
**Stories:** US-010

---

### UOW-022: Webhook + Push Notification Delivery
**Type:** Backend — Integration  
**Est:** 1.5 days  
**Description:** Implement `WebhookDelivery` (HTTP POST with retry) and `PushNotificationSender` (Web Push VAPID). Send both on alert trigger; send clear notification on zone recovery.

**Deliverables:**
- `backend/app/services/webhook_delivery.py`
- `backend/app/services/push_sender.py`
- `frontend/pages/api/push-subscribe.ts` — subscription endpoint
- Service worker for Web Push in frontend

**Dependencies:** UOW-021  
**Stories:** US-010

---

### UOW-023: Alert Sidebar (Frontend)
**Type:** Frontend  
**Est:** 0.5 day  
**Description:** Real-time alert list panel on dashboard showing all active zones at depth_level ≥ 3. WebSocket or SWR polling feed.

**Deliverables:**
- `frontend/components/AlertSidebar.tsx`
- Alert card: road name, depth level badge, time elapsed, map link

**Dependencies:** UOW-022, UOW-017  
**Stories:** US-010

---

### UOW-024: Route Safety Scoring API
**Type:** Backend — API  
**Est:** 2 days  
**Description:** Implement `POST /api/v1/route/safety`. Uses PostGIS to find all flood zones intersecting the route geometry. Computes per-segment safety scores. Returns alternative route if primary has depth_level ≥ 3 segments.

**Deliverables:**
- `backend/app/routers/route.py`
- `backend/app/services/route_scorer.py`
- Response time < 1 second P95

**Dependencies:** UOW-016, UOW-008  
**Stories:** US-011

---

### UOW-025: Observability — Grafana + Prometheus
**Type:** Infrastructure — Monitoring  
**Est:** 1.5 days  
**Description:** Instrument FastAPI with Prometheus metrics: API call count, Gemini latency, estimated cost per day, camera online/offline ratio, alert trigger rate. Deploy Grafana dashboard.

**Deliverables:**
- `backend/app/middleware/metrics.py`
- `docker-compose.yml` — Prometheus + Grafana services
- Pre-built Grafana dashboard JSON

**Dependencies:** UOW-001  
**Stories:** US-012

---

### UOW-026: Rate Limiting + Load Testing
**Type:** Infrastructure — Scale  
**Est:** 1.5 days  
**Description:** Implement Redis-backed rate limiting (100 req/min/IP for public endpoints). Run Locust load test simulating 100 concurrent cameras + 10,000 API clients. Fix bottlenecks.

**Deliverables:**
- `backend/app/middleware/rate_limiter.py`
- `tests/load/locustfile.py`
- Load test report: P95 latency, error rates at target scale

**Dependencies:** UOW-020, UOW-012  
**Stories:** US-009, US-011

---

## Dependency Graph

```
UOW-001 ──► UOW-002 ──► UOW-003 ──► UOW-004 ──► UOW-005 ──► UOW-006 ──► UOW-007
                                          │
                                          ├──► UOW-008 ──► UOW-009 ──► UOW-010 ──► UOW-011 ──► UOW-012 ──► UOW-013
                                          │                                                              │
                                          └──────────────────────────────────────────────────────────────▼
                                                                                                   UOW-014 ──► UOW-015 ──► UOW-016
                                                                                                       │               │
                                                                                               UOW-021 ◄┘               └──► UOW-017 ──► UOW-018
                                                                                                   │                              │
                                                                                               UOW-022 ──► UOW-023          UOW-019
                                                                                                                    
UOW-016 ──► UOW-024
UOW-020 ──► UOW-026
UOW-001 ──► UOW-025
UOW-001 ──► UOW-008
```

---

## Unit Summary Table

| Unit | Phase | Type | Est. (days) | Stories |
|------|-------|------|------------|---------|
| UOW-001 | 1 | Infrastructure | 0.5 | — |
| UOW-002 | 1 | Backend/AI | 1.0 | US-004 |
| UOW-003 | 1 | Backend/AI | 0.5 | US-004 |
| UOW-004 | 1 | Backend/Data | 0.5 | US-004, US-006 |
| UOW-005 | 1 | Backend/API | 1.0 | US-005 |
| UOW-006 | 1 | Frontend | 1.5 | US-005 |
| UOW-007 | 1 | Content/QA | 0.5 | US-005 |
| UOW-008 | 2 | Infrastructure | 1.0 | — |
| UOW-009 | 2 | Backend/Data | 1.0 | US-001, US-002 |
| UOW-010 | 2 | Backend | 2.0 | US-002, US-004 |
| UOW-011 | 2 | Backend/Privacy | 1.5 | US-013 |
| UOW-012 | 2 | Infrastructure | 1.0 | US-004 |
| UOW-013 | 2 | Backend | 0.5 | US-004 |
| UOW-014 | 2 | Backend/Core | 1.5 | US-006 |
| UOW-015 | 2 | Backend | 1.5 | US-007, US-009 |
| UOW-016 | 2 | Backend/API | 1.0 | US-007, US-008, US-009 |
| UOW-017 | 2 | Frontend | 2.0 | US-007 |
| UOW-018 | 2 | Frontend | 1.5 | US-007, US-008 |
| UOW-019 | 2 | Full-stack | 1.0 | US-003 |
| UOW-020 | 2 | Backend/Security | 0.5 | US-009 |
| UOW-021 | 3 | Backend/Core | 1.5 | US-010 |
| UOW-022 | 3 | Backend | 1.5 | US-010 |
| UOW-023 | 3 | Frontend | 0.5 | US-010 |
| UOW-024 | 3 | Backend/API | 2.0 | US-011 |
| UOW-025 | 3 | Infrastructure | 1.5 | US-012 |
| UOW-026 | 3 | Infrastructure | 1.5 | US-009, US-011 |
| **Total** | | | **30.5 days** | |
