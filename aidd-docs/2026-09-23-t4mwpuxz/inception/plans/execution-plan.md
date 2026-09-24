# FloodWheel — Execution Plan

## Session: 2026-09-23-t4mwpuxz

---

## Project Summary

| Item | Value |
|------|-------|
| Project Name | FloodWheel |
| Type | Greenfield |
| Total Complexity | High |
| Depth Level | Comprehensive |
| Total User Stories | 13 stories / 58 story points |
| Estimated Phases | 3 construction phases |
| Primary Tech Stack | Python (FastAPI) + Gemini API + PostgreSQL/PostGIS + Next.js + Mapbox |

---

## Phase Overview

```
Phase 1: Core AI Engine + Demo Mode       (Week 1–2)  ← Hackathon-ready
Phase 2: Live Infrastructure + Heatmap    (Week 3–5)  ← MVP production
Phase 3: Alerts, Routing, Scaling         (Week 6–8)  ← Full product
```

---

## Phase 1 — Core AI Engine & Hackathon Demo

**Goal:** A working demo: upload images → Gemini analysis → flood depth result displayed. This is the minimum needed for a hackathon presentation.

**Duration:** 1–2 weeks  
**Milestone:** Demo-ready build

### Units of Work

| Unit | Description | Stories | Est. |
|------|-------------|---------|------|
| P1-U1 | Project scaffold (monorepo, Docker Compose, env config) | — | 0.5d |
| P1-U2 | Gemini Vision client module with VLRDR prompt | US-004 | 1d |
| P1-U3 | FloodReading schema & JSON validation | US-004, US-006 | 0.5d |
| P1-U4 | Demo upload REST endpoint (`POST /api/v1/analyze`) | US-005 | 1d |
| P1-U5 | Frontend demo panel (image upload + result display) | US-005 | 1.5d |
| P1-U6 | Sample data: 3 pre-loaded flood images with expected results | US-005 | 0.5d |

**Phase 1 Exit Criteria:**
- [ ] Upload 3 flood images → results in < 3 seconds
- [ ] AI output includes depth level, cm estimate, reasoning, reference objects
- [ ] Demo runs from a single `docker-compose up` command

---

## Phase 2 — Live Infrastructure, Camera Management & Heatmap

**Goal:** Production-grade pipeline with real camera feeds, persistent storage, and live city heatmap.

**Duration:** 3 weeks  
**Milestone:** Single-city MVP (e.g., HCMC pilot with 10 cameras)

### Units of Work

| Unit | Description | Stories | Est. |
|------|-------------|---------|------|
| P2-U1 | Camera registry model + YAML config loader | US-001 | 1d |
| P2-U2 | Camera frame puller (async scheduler, HTTPS/RTSP) | US-004 | 2d |
| P2-U3 | Privacy filter: license plate blurring (PaddleOCR / AWS Rekognition) | US-013 | 1.5d |
| P2-U4 | PostgreSQL + PostGIS setup: zones, cameras, readings tables | — | 1d |
| P2-U5 | Flood data aggregation engine (confidence-weighted, rolling window) | US-006 | 1.5d |
| P2-U6 | GeoJSON heatmap generator + tile server | US-007, US-009 | 2d |
| P2-U7 | Camera health monitoring (ONLINE/OFFLINE detection) | US-002 | 1d |
| P2-U8 | Operator dashboard: map view + camera list sidebar | US-007, US-002 | 2d |
| P2-U9 | Zone detail panel + 24h history chart | US-008 | 1.5d |
| P2-U10 | Manual override feature | US-003 | 1d |
| P2-U11 | Weather API integration (rainfall-triggered polling) | US-004 | 0.5d |
| P2-U12 | API key authentication middleware | US-009 | 0.5d |

**Phase 2 Exit Criteria:**
- [ ] System ingests frames from 10+ cameras autonomously
- [ ] Heatmap updates every 5 minutes with real data
- [ ] Operators can manage cameras and override readings
- [ ] All stored frames have license plates blurred

---

## Phase 3 — Alerts, Routing API & Scale

**Goal:** Full production system with safety alerts, route scoring, and scalability to 100+ cameras.

**Duration:** 2–3 weeks  
**Milestone:** Production launch

### Units of Work

| Unit | Description | Stories | Est. |
|------|-------------|---------|------|
| P3-U1 | Alert engine: threshold detection + deduplication | US-010 | 1.5d |
| P3-U2 | Webhook delivery + retry mechanism | US-010 | 1d |
| P3-U3 | Web Push notification support | US-010 | 1d |
| P3-U4 | Route safety scoring endpoint | US-011 | 2d |
| P3-U5 | Grafana dashboard: API cost + latency + accuracy | US-012 | 1.5d |
| P3-U6 | Redis-based rate limiting for public endpoints | US-009 | 0.5d |
| P3-U7 | Horizontal scaling: Redis task queue (ARQ) for camera polling | US-004 | 2d |
| P3-U8 | OpenAPI 3.0 documentation | US-009, US-011 | 0.5d |
| P3-U9 | Load testing: 100 cameras concurrent | — | 1d |
| P3-U10 | Security hardening: encrypted camera URLs, 2FA admin | SRS NFR-SEC | 1d |

**Phase 3 Exit Criteria:**
- [ ] Alerts delivered within 5 minutes of depth_level ≥ 3
- [ ] Route safety API responds in < 1 second
- [ ] System handles 100 concurrent cameras without degradation
- [ ] Full OpenAPI documentation published

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini API rate limits exceeded under 100-camera load | Medium | High | Implement request queue with backoff; use Flash not Pro |
| Camera frames have no visible vehicles (bad angle, no traffic) | High | Medium | Confidence thresholding; flag low-confidence zones; expand to night/empty-road handling |
| City government won't provide camera feed access | High | High | Phase 1 demo uses static images; Phase 2 uses public/open CCTV streams |
| License plate blurring adds significant latency | Low | Medium | Run blur async post-storage using worker queue; AI analysis on unblurred in-memory frames |
| Gemini misclassifies depth due to unusual vehicle types (trucks, buses) | Medium | Medium | Extend prompt with truck/bus reference points; add vehicle type to output |
| Flood depth varies within 200m road segment | Medium | Medium | Use smaller zone granularity (50m) in dense urban areas |

---

## Technology Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Model | Gemini 1.5 Flash | Cost-optimized; < $0.005/1K tokens; adequate vision quality |
| Backend | Python + FastAPI | Best Gemini Python SDK; async-native; strong typing |
| Database | PostgreSQL + PostGIS | Geospatial queries essential for zone lookup; mature |
| Task Queue | ARQ (async Redis Queue) | Lightweight; Python-native async; fits FastAPI |
| Frontend | Next.js + Mapbox GL JS | SSR + PWA; Mapbox best for custom GeoJSON overlays |
| Cloud | GCP (Cloud Run + Cloud SQL) | Co-location with Gemini API; managed scaling |
| Privacy Filter | PaddleOCR (detection) + OpenCV (blur) | Open source; fast; runs in-container |
