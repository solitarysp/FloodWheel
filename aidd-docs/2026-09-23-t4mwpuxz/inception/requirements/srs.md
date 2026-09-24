# Software Requirements Specification
# FloodWheel: Real-Time Urban Flood Depth Mapping from Traffic Cameras

**Document ID:** FW-SRS-001  
**Version:** 1.0.0  
**Status:** Draft — Pending User Review  
**Date:** 2026-09-23  
**Session:** 2026-09-23-t4mwpuxz  
**Standard:** IEEE 830 / ISO/IEC/IEEE 29148:2018  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features (Functional Requirements)](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Constraints](#6-system-constraints)
7. [Appendices](#7-appendices)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the requirements for **FloodWheel**, a real-time urban flood depth mapping system. The system uses existing city traffic camera (CCTV) feeds processed through Google Gemini Vision AI to estimate flood water depth without physical sensors, producing a live city-wide flood heatmap and routing safety alerts.

This document is intended for:
- Development team (engineers, architects)
- Product stakeholders and reviewers
- Hackathon judges evaluating the project
- City government technology partners

### 1.2 Scope
**FloodWheel** (Product Name) is a web-based SaaS platform that:
- Ingests image frames from existing traffic camera infrastructure
- Uses Gemini Vision AI to perform Visual Landmark Relative Depth Reasoning (VLRDR) — estimating flood depth from visible vehicle features (wheel submersion, exhaust pipe height, bonnet level)
- Aggregates per-camera readings into a geospatial flood depth layer
- Serves a real-time flood heatmap via REST API and web dashboard
- Sends route safety alerts and push notifications

**In scope:** Image ingestion, AI inference, data aggregation, heatmap generation, REST API, web dashboard, alert engine.

**Out of scope (v1.0):** Flood prediction/forecasting, native mobile apps (iOS/Android), physical sensor integration, traffic analytics beyond flood detection.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|-----------|
| CCTV | Closed-Circuit Television — existing traffic/city surveillance cameras |
| VLRDR | Visual Landmark Relative Depth Reasoning — the core AI technique of using visible vehicle features as flood depth references |
| Depth Level | A 0–5 ordinal scale of flood severity (see §2.4) |
| Flood Zone | A geographic road segment (~200m) tracked as a single unit |
| GeoJSON | A geospatial data format (RFC 7946) |
| Gemini API | Google's multimodal generative AI API |
| PWA | Progressive Web App |
| Frame | A single image extracted from a camera feed |
| Confidence Score | A 0.0–1.0 float indicating AI certainty in its flood depth assessment |

### 1.4 References
- Google Gemini API Documentation: https://ai.google.dev/docs
- IEEE Std 830-1998: IEEE Recommended Practice for SRS
- ISO/IEC/IEEE 29148:2018: Requirements Engineering
- GeoJSON RFC 7946: https://datatracker.ietf.org/doc/html/rfc7946

### 1.5 Overview
Section 2 provides product perspective and context. Section 3 defines all system features. Section 4 describes external interfaces. Section 5 covers non-functional requirements. Section 6 lists constraints.

---

## 2. Overall Description

### 2.1 Product Perspective
FloodWheel is a new standalone system that interfaces with:
- Existing city CCTV camera infrastructure (as a consumer, not controller)
- Google Gemini API (for AI inference)
- Mapping services (Google Maps / Mapbox) for visualization
- External alerting systems (webhooks, push notification services)
- Ride-hailing and navigation apps (via REST API integration)

```
[City CCTV Cameras] ──frames──► [FloodWheel Ingestion Engine]
                                          │
                                          ▼
                               [Gemini Vision AI Engine]
                                          │
                              structured flood depth JSON
                                          │
                                          ▼
                               [Aggregation & Storage]
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                  [REST API]      [Web Dashboard]    [Alert Engine]
                        │                                    │
                   [3rd party          [Operators /    [Push Notifications /
                 apps: Grab, etc.]   Emergency Teams]   Webhooks / SMS]
```

### 2.2 Product Functions (Summary)
1. **Camera Feed Ingestion** — Pull frames from CCTV streams on a scheduled basis
2. **AI Flood Analysis** — Submit frames to Gemini with VLRDR prompt; receive structured depth JSON
3. **Data Aggregation** — Combine multi-camera readings per road segment with confidence weighting
4. **Heatmap Generation** — Produce GeoJSON and raster tile overlays of flood depth citywide
5. **Public API** — REST endpoints for flood status, route scoring, camera status
6. **Web Dashboard** — Operator and public-facing map with real-time data
7. **Alert Engine** — Trigger notifications when depth thresholds are crossed

### 2.3 User Classes and Characteristics

| User Class | Tech Level | Primary Interface | Key Needs |
|------------|-----------|------------------|-----------|
| City Operator | High | Web Dashboard (full access) | Full map, camera management, overrides, analytics |
| Emergency Responder | Medium | Web Dashboard (mobile) | Critical alerts, safe routes |
| Ride-hailing Driver | Low | Third-party app integration / public map | Route warnings, real-time status |
| General Public / Commuter | Low | Public web map | Road status query by location |
| System Integrator | High | REST API | Programmatic data access |
| Hackathon Demo Audience | Varies | Demo interface (static image upload) | Clear, visual, fast results |

### 2.4 Flood Depth Classification Scale

| Level | Label | Visual Indicator | Depth (cm) | Color Code | Action |
|-------|-------|-----------------|-----------|-----------|--------|
| 0 | Clear | No visible water | 0 | `#00C853` Green | Normal |
| 1 | Surface Water | Water on road, no wheel contact | < 5 | `#FFD600` Yellow | Monitor |
| 2 | Caution | Water covers ~1/3 motorcycle wheel | 15–20 | `#FF6D00` Orange | Caution |
| 3 | High Risk | Water at exhaust pipe height | 30–35 | `#DD2C00` Red | Avoid |
| 4 | Critical | Water at motorcycle seat / car bonnet | 50–70 | `#6200EA` Purple | Do Not Enter |
| 5 | Catastrophic | Vehicles fully submerged | > 70 | `#000000` Black | Emergency |

### 2.5 Operating Environment
- **Backend:** Cloud-hosted (GCP preferred), containerized via Docker
- **AI Inference:** Google Gemini API (external cloud service)
- **Frontend:** Modern web browsers (Chrome 100+, Firefox 100+, Safari 15+)
- **Camera Sources:** HTTP/HTTPS JPEG snapshot URLs, RTSP streams, or uploaded static images
- **Network:** Requires internet connectivity; no on-premise compute required

### 2.6 Design and Implementation Constraints
- Must use Gemini API (not a locally-hosted vision model)
- Must not require installation of hardware at camera sites
- Must operate on camera feeds that were installed for traffic management, not specifically for flood sensing (variable camera angle and height)
- Must be demonstrable with 3 static images in under 3 seconds (demo mode)

### 2.7 Assumptions and Dependencies
- A-001: At least 30% of frames during flood events contain visible vehicles
- A-002: City governments will permit read-only access to camera feed URLs for pilot
- A-003: Gemini 1.5 Flash can reliably detect wheel submersion under rain/storm lighting
- A-004: Honda Wave/Future motorcycle wheel diameter (~50cm) is a valid universal reference for Southeast Asian urban traffic
- A-005: Flood depth is approximately uniform within a 200m road segment

---

## 3. System Features

---

### 3.1 Feature: Camera Feed Ingestion

**Priority:** High  
**Description:** The system pulls image frames from registered CCTV cameras at configurable intervals.

#### 3.1.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-ING-001 | The system SHALL accept camera feed URLs in the following formats: HTTPS JPEG/PNG snapshot URL, RTSP stream URL, MJPEG stream URL |
| FR-ING-002 | The system SHALL accept static image file uploads (JPEG, PNG, WebP) for demo mode |
| FR-ING-003 | The system SHALL pull frames from each registered camera at a configurable interval (range: 30s–300s; default: 60s during rainfall) |
| FR-ING-004 | The system SHALL support parallel frame acquisition for up to 100 cameras simultaneously |
| FR-ING-005 | The system SHALL increase polling frequency to every 30 seconds when weather API indicates active rainfall (>10mm/hour) |
| FR-ING-006 | The system SHALL reduce polling frequency to every 300 seconds when no rainfall is detected |
| FR-ING-007 | The system SHALL log a camera as OFFLINE if no frame is received within 5 consecutive polling intervals |
| FR-ING-008 | The system SHALL store raw frames in temporary storage for a maximum of 24 hours |
| FR-ING-009 | The system SHALL apply license plate blurring to all stored frames using a privacy filter before archival |

---

### 3.2 Feature: Gemini Vision AI Analysis Engine

**Priority:** High (Core Feature)  
**Description:** The AI engine analyzes each frame using Gemini Vision to detect flood presence and estimate depth using the VLRDR method.

#### 3.2.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-AI-001 | The system SHALL submit each camera frame to the Gemini 1.5 Flash API with a structured multi-part prompt (image + system instructions) |
| FR-AI-002 | The system prompt SHALL instruct Gemini to: (a) identify vehicles in the frame, (b) identify water contact points on vehicles, (c) classify depth level 0–5, (d) return a structured JSON response |
| FR-AI-003 | The Gemini response SHALL be validated against a defined JSON schema before acceptance |
| FR-AI-004 | The system SHALL output per-frame analysis as a structured `FloodReading` object containing: camera_id, timestamp, flood_detected (bool), confidence_score (float 0–1), depth_level (int 0–5 or null), depth_estimate_cm_min (int), depth_estimate_cm_max (int), reference_objects_used (string[]), reasoning (string), alert_message (string) |
| FR-AI-005 | The system SHALL return `depth_level: null` and `confidence_score < 0.3` when no vehicles or flood indicators are visible in the frame |
| FR-AI-006 | The system SHALL retry failed Gemini API calls up to 3 times with exponential backoff (1s, 2s, 4s delays) |
| FR-AI-007 | The system SHALL log all API calls including token usage for cost monitoring |
| FR-AI-008 | The system SHALL support a configurable Gemini model parameter to switch between Flash and Pro versions |
| FR-AI-009 | The system SHALL process a batch of 3–5 demo images and return results within 3 seconds in demo mode |

#### 3.2.2 VLRDR Prompt Specification
The system prompt sent to Gemini SHALL include the following calibration reference table:

```
Vehicle Reference Points (Southeast Asian urban traffic):
- Motorcycle wheel diameter: ~50cm (Honda Wave/Future/Vision)
  • 1/3 submerged = 15–20cm flood depth
  • 1/2 submerged (at exhaust pipe) = 30–35cm flood depth
  • Seat submerged = 50–70cm flood depth
- Car tire/wheel arch: ~35–40cm from ground
- Car door sill: ~30cm from ground
- Car bonnet (hood): ~60–70cm from ground
```

---

### 3.3 Feature: Flood Data Aggregation

**Priority:** High  
**Description:** Combines per-camera readings into road-segment-level flood assessments.

#### 3.3.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-AGG-001 | The system SHALL maintain a rolling 30-minute window of `FloodReading` records per camera |
| FR-AGG-002 | The system SHALL group cameras into Flood Zones (road segments of approximately 200m) using GPS coordinates |
| FR-AGG-003 | The system SHALL compute the zone-level `depth_level` as the confidence-weighted median of all camera readings in that zone within the rolling window |
| FR-AGG-004 | The system SHALL flag a road segment as flooded if at least 2 cameras in the same zone report `depth_level ≥ 2` with `confidence_score ≥ 0.6` |
| FR-AGG-005 | The system SHALL decay old readings: readings older than 15 minutes SHALL have their confidence multiplied by 0.7; readings older than 25 minutes by 0.4 |
| FR-AGG-006 | The system SHALL store aggregated zone readings in a time-series database (1-second granularity) |
| FR-AGG-007 | The system SHALL retain historical aggregated data for 90 days |

---

### 3.4 Feature: Flood Heatmap Generation

**Priority:** High  
**Description:** Produces a live city-wide geospatial visualization of flood depth.

#### 3.4.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-MAP-001 | The system SHALL generate a GeoJSON FeatureCollection where each Feature represents a road segment with properties: zone_id, depth_level, depth_estimate_cm_min, depth_estimate_cm_max, last_updated, confidence, camera_count |
| FR-MAP-002 | The GeoJSON heatmap SHALL be regenerated every 5 minutes |
| FR-MAP-003 | The system SHALL serve raster tile images in z/x/y format (Slippy Map tile standard) at zoom levels 12–17 |
| FR-MAP-004 | The heatmap color scale SHALL follow the Depth Level color scheme defined in §2.4 |
| FR-MAP-005 | Road segments with no camera coverage SHALL be rendered as gray with label "No data" |
| FR-MAP-006 | The system SHALL serve the latest heatmap GeoJSON at a cacheable public URL with max-age=300s |

---

### 3.5 Feature: REST API

**Priority:** High  
**Description:** Programmatic interface for flood data access and integration with third-party apps.

#### 3.5.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-API-001 | The system SHALL expose a REST API documented with OpenAPI 3.0 specification |
| FR-API-002 | `GET /api/v1/flood/status?lat={lat}&lng={lng}&radius={meters}` — returns flood status for the nearest road segments within radius |
| FR-API-003 | `GET /api/v1/flood/zone/{zone_id}` — returns current and historical flood readings for a specific zone |
| FR-API-004 | `GET /api/v1/flood/heatmap` — returns the current GeoJSON heatmap |
| FR-API-005 | `POST /api/v1/analyze` — accepts an image upload and returns an AI flood analysis (demo/operator use) |
| FR-API-006 | `POST /api/v1/route/safety` — accepts {origin, destination} GPS coordinates and returns a route safety report with per-segment flood levels |
| FR-API-007 | `GET /api/v1/cameras` — returns list of registered cameras with status (ONLINE/OFFLINE/OVERRIDE) |
| FR-API-008 | All API endpoints (except public map) SHALL require API key authentication via `X-API-Key` header |
| FR-API-009 | The public `/api/v1/flood/heatmap` and `/api/v1/flood/status` endpoints SHALL be rate-limited to 100 requests/minute per IP |
| FR-API-010 | All API responses SHALL include a `Cache-Control` header appropriate to the data freshness |

---

### 3.6 Feature: Web Dashboard

**Priority:** Medium  
**Description:** Operator and public-facing web interface for monitoring flood status.

#### 3.6.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-WEB-001 | The dashboard SHALL display a full-screen interactive city flood map with the live heatmap overlay |
| FR-WEB-002 | Clicking a road segment on the map SHALL show a panel with: current depth level, depth estimate, last update time, camera thumbnails, and 24-hour history chart |
| FR-WEB-003 | The dashboard SHALL display a list of ACTIVE ALERTS (road segments at depth_level ≥ 3) in a sidebar |
| FR-WEB-004 | Operator users SHALL be able to manually override the depth_level for any road segment with a comment |
| FR-WEB-005 | The dashboard SHALL be mobile-responsive and usable on smartphones (320px minimum width) |
| FR-WEB-006 | The dashboard SHALL auto-refresh map data every 60 seconds |
| FR-WEB-007 | Offline cameras SHALL be indicated with a distinct icon on the map |
| FR-WEB-008 | The dashboard SHALL include a demo upload panel where a user can upload 1–5 images and see instant AI analysis results |

---

### 3.7 Feature: Alert Engine

**Priority:** High (Safety-Critical)  
**Description:** Sends notifications when flood levels reach danger thresholds.

#### 3.7.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-ALT-001 | The system SHALL trigger an alert when a road zone transitions from depth_level < 3 to depth_level ≥ 3 |
| FR-ALT-002 | The system SHALL send alerts to configured webhook endpoints (HTTP POST with JSON payload) |
| FR-ALT-003 | Alert payload SHALL contain: zone_id, road_name, depth_level, depth_estimate_cm_min, depth_estimate_cm_max, alert_message, timestamp, heatmap_url |
| FR-ALT-004 | The system SHALL support Web Push Notifications for subscribed users |
| FR-ALT-005 | The system SHALL prevent duplicate alerts: the same zone SHALL not trigger another alert until depth_level drops below 2 and then rises above 3 again |
| FR-ALT-006 | The system SHALL send a "clear" notification when a zone transitions from depth_level ≥ 3 to depth_level ≤ 1 |

---

### 3.8 Feature: Camera Management

**Priority:** Medium  
**Description:** Administration of camera registration and configuration.

#### 3.8.1 Functional Requirements

| ID | Requirement |
|----|------------|
| FR-CAM-001 | Cameras SHALL be registered via a YAML or JSON configuration file with fields: camera_id, name, lat, lng, zone_id, stream_url, mount_height_m, camera_angle (street_level / elevated / overhead) |
| FR-CAM-002 | The system SHALL support dynamic camera registration via `POST /api/v1/admin/cameras` (operator only) |
| FR-CAM-003 | The system SHALL adjust depth estimation confidence based on camera_angle: street_level (+0.1 bonus), elevated (no adjustment), overhead (–0.2 penalty, poor vehicle reference visibility) |
| FR-CAM-004 | Operator SHALL be able to deactivate a camera via the dashboard without removing its historical data |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- **Web Dashboard:** Single-page application (React or Next.js recommended) with map-centric layout
- **Map component:** Google Maps JS API or Mapbox GL JS with custom GeoJSON overlay
- **Demo Interface:** Drag-and-drop image upload area with live result display

### 4.2 Hardware Interfaces
- No proprietary hardware. The system interfaces with existing city CCTV cameras via network only.

### 4.3 Software Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| Google Gemini API | REST/gRPC | Primary AI inference engine. Model: `gemini-1.5-flash-latest` |
| Weather/Rain API | REST | Trigger dynamic polling frequency. Provider: Open-Meteo (free) or Google Weather API |
| Google Maps / Mapbox | JS SDK | Frontend map rendering |
| Web Push API | Browser API | Push notifications to subscribed users |
| PostgreSQL + PostGIS | Database | Geospatial storage for zones, readings, history |
| Redis | Cache | Frame analysis caching, rate limiting, session management |

### 4.4 Communication Interfaces
- All API communication over HTTPS (TLS 1.3)
- Camera stream access over HTTP/HTTPS or RTSP
- Webhook delivery over HTTPS POST
- Internal service communication via REST or message queue (Redis Streams or Google Pub/Sub)

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-PERF-001 | Gemini API call latency per frame | P95 < 5 seconds |
| NFR-PERF-002 | End-to-end pipeline latency (frame → heatmap) | < 2 minutes |
| NFR-PERF-003 | REST API flood status query response time | P99 < 500ms |
| NFR-PERF-004 | Dashboard initial load time | < 3 seconds |
| NFR-PERF-005 | Demo mode: 3–5 images analyzed and displayed | < 3 seconds total |
| NFR-PERF-006 | Maximum concurrent cameras supported | 100 (v1.0); 1,000 with horizontal scaling |

### 5.2 Reliability Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-REL-001 | System uptime during active rainfall events | ≥ 99.5% |
| NFR-REL-002 | Graceful degradation when Gemini API unavailable | Serve cached data with "stale data" flag |
| NFR-REL-003 | Data retention for flood event logs | 90 days |
| NFR-REL-004 | Maximum tolerable data loss on system failure | < 5 minutes of readings |

### 5.3 Accuracy Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-ACC-001 | Depth level classification accuracy vs. ground truth | Within ±1 level |
| NFR-ACC-002 | Minimum acceptable confidence score for map display | ≥ 0.5 |
| NFR-ACC-003 | False negative rate for depth_level ≥ 3 (safety-critical) | < 10% |
| NFR-ACC-004 | False positive rate for depth_level ≥ 3 | < 20% |

### 5.4 Security Requirements

| ID | Requirement |
|----|------------|
| NFR-SEC-001 | All camera stream URLs SHALL be stored AES-256 encrypted at rest |
| NFR-SEC-002 | API access SHALL require authentication (API key or OAuth 2.0) for all non-public endpoints |
| NFR-SEC-003 | The Gemini API key SHALL never be exposed in client-side code or API responses |
| NFR-SEC-004 | Public endpoints SHALL be protected by rate limiting (100 req/min/IP) |
| NFR-SEC-005 | Admin endpoints SHALL require two-factor authentication |

### 5.5 Privacy Requirements

| ID | Requirement |
|----|------------|
| NFR-PRV-001 | Vehicle license plates visible in frames SHALL be blurred before storage |
| NFR-PRV-002 | Raw frame images SHALL NOT be accessible via the public API |
| NFR-PRV-003 | Only aggregated flood data (not per-vehicle data) SHALL be publicly accessible |
| NFR-PRV-004 | Frame storage SHALL be automatically purged after 24 hours |

### 5.6 Cost Efficiency Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-COST-001 | Gemini API cost per full city scan (100 cameras) | < $0.50 USD |
| NFR-COST-002 | Monthly operating cost for 100-camera city at 4 hours/day rainfall | < $500 USD |
| NFR-COST-003 | Frame skipping when no rainfall detected | Reduce API calls by ≥ 80% |

---

## 6. System Constraints

| ID | Constraint |
|----|-----------|
| C-001 | Must use Google Gemini API (not an alternative AI provider) as core inference engine |
| C-002 | No physical hardware installation at camera sites is permitted |
| C-003 | Must operate with existing city CCTV infrastructure (cannot require camera upgrades) |
| C-004 | Camera feeds must be accessible via network without on-site VPN or special hardware |
| C-005 | Must provide a functional demo using 3 static images in a hackathon context |
| C-006 | System must be cloud-deployable with containerized services (Docker) |
| C-007 | Must comply with applicable data protection regulations for each target city/country |

---

## 7. Appendices

### Appendix A: Gemini Prompt Template

```
System: You are FloodWheel, an expert urban flood depth analyst. 
Your task is to analyze traffic camera images and estimate flood water depth 
using visible vehicle features as reference objects.

Reference calibration (Southeast Asian urban traffic):
- Standard motorcycle (Honda Wave/Future/Vision) wheel diameter: ~50cm
  • Water at 1/3 wheel height = 15–20cm depth
  • Water at 1/2 wheel / exhaust pipe level = 30–35cm depth  
  • Water at seat level = 50–70cm depth
- Car tire bottom = ~20cm from ground; wheel arch = ~35–40cm
- Car door sill = ~30cm; car bonnet (hood) = ~60–70cm

Depth Levels:
0 = No water visible (0cm)
1 = Surface water, no wheel contact (<5cm)
2 = 1/3 motorcycle wheel submerged (15–20cm)
3 = Exhaust pipe/half wheel submerged (30–35cm) — HIGH RISK
4 = Motorcycle seat / car bonnet submerged (50–70cm) — CRITICAL
5 = Vehicles fully submerged (>70cm) — CATASTROPHIC EMERGENCY

User: Analyze this traffic camera frame. Respond ONLY with a JSON object:
{
  "flood_detected": boolean,
  "confidence_score": float (0.0-1.0),
  "depth_level": integer (0-5) or null if no vehicles/water visible,
  "depth_estimate_cm_min": integer,
  "depth_estimate_cm_max": integer,
  "reference_objects_used": ["motorcycle wheel", "car door sill", etc.],
  "reasoning": "brief explanation of what visual evidence you used",
  "alert_message": "human-readable warning suitable for public display"
}
```

### Appendix B: FloodReading JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "required": ["camera_id", "timestamp", "flood_detected", "confidence_score"],
  "properties": {
    "camera_id": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "flood_detected": { "type": "boolean" },
    "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "depth_level": { "type": ["integer", "null"], "minimum": 0, "maximum": 5 },
    "depth_estimate_cm_min": { "type": "integer", "minimum": 0 },
    "depth_estimate_cm_max": { "type": "integer", "minimum": 0 },
    "reference_objects_used": { "type": "array", "items": { "type": "string" } },
    "reasoning": { "type": "string", "maxLength": 500 },
    "alert_message": { "type": "string", "maxLength": 200 }
  }
}
```

### Appendix C: Technology Stack (Proposed)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend API | Python + FastAPI | Best Gemini SDK, async, typed |
| AI Inference | Google Gemini 1.5 Flash | Cost-effective, fast, vision-capable |
| Task Queue | Redis + ARQ / Celery | Async camera polling at scale |
| Database | PostgreSQL + PostGIS | Geospatial queries for zone lookup |
| Cache | Redis | API response caching, rate limiting |
| Frontend | Next.js (React) | SSR, PWA support, TypeScript |
| Map | Mapbox GL JS | Custom styling, vector tiles, GeoJSON |
| Containerization | Docker + Docker Compose | Portable deployment |
| Cloud | Google Cloud Platform | Colocation with Gemini API, Maps |
| Monitoring | Grafana + Prometheus | Cost tracking, latency, accuracy |
