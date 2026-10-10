# FloodWheel — System Architecture

## 1. High-Level Architecture Overview
FloodWheel is designed as a distributed, service-oriented system comprising a modern web frontend, an asynchronous FastAPI backend service, a relational spatial database, and Google GenAI Gemini multimodal inference:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Frontend                      │
│   Landing Page (/)   │   Live Demo (/demo)   │  Dashboard (/dashboard)
│   Components: FloodMap, DemoUpload, ResultCard, AlertSidebar    │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / REST / GeoJSON
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend Engine                     │
│  Routers:                                                       │
│   - POST /api/v1/analyze          (Single frame VLRDR analysis) │
│   - GET  /api/v1/flood/heatmap    (City-wide GeoJSON heatmap)   │
│   - GET  /api/v1/flood/status     (Zone & radius flood levels)  │
│   - POST /api/v1/route/safety     (Waypoint route scoring)      │
│   - POST /api/v1/admin/*          (Manual override & polling)   │
│                                                                 │
│  Services & Workers:                                            │
│   - GeminiClient (Gemini 3.8 Flash SDK)                         │
│   - VLRDRPromptBuilder (System prompt & landmark tables)        │
│   - FloodReadingParser (JSON validation & fallback logic)       │
│   - PollingScheduler & FramePuller (Async camera ingest)        │
│   - ZoneAggregator (Spatial averaging & status builder)         │
│   - ThresholdMonitor & DeduplicationGuard (Alert engine)        │
│   - RouteScorer (Waypoints spatial collision detector)          │
│   - MetricsMiddleware (Prometheus observability)                │
└────────────────────────────────┬────────────────────────────────┘
                 │               │
                 ▼               ▼
┌────────────────────────┐  ┌────────────────────────────────────┐
│   PostgreSQL / PostGIS │  │      Google Gemini API (GenAI)     │
│  Cameras, FloodZones,  │  │   Gemini 3.8 Flash Vision Model    │
│  Readings, Alerts      │  │   Multimodal Spatial Reasoning     │
└────────────────────────┘  └────────────────────────────────────┘
```

## 2. Ingestion & Inference Data Flow
1. **Frame Acquisition**: Traffic camera snapshot fetched asynchronously by `FramePuller` or submitted via `POST /api/v1/analyze` in the Demo UI.
2. **Privacy Filtering**: Automated Gaussian blur on license plates and human faces before transmission.
3. **Prompt Synthesis**: `VLRDRPromptBuilder` crafts zero-shot spatial prompts with vehicle submersion calibration standards.
4. **Multimodal Inference**: `GeminiClient` invokes Gemini 3.8 Flash with low temperature (`0.1`) and structured JSON schema enforcement.
5. **Validation & Storage**: `FloodReadingParser` parses the response into `FloodReading`, saving to PostGIS.
6. **Aggregation & Broadcasting**: `ZoneAggregator` updates the zone depth level; `ThresholdMonitor` evaluates alerts and triggers webhooks/browser push notifications when `depth_level >= 3`.
7. **Spatial Visualization**: `HeatmapBuilder` converts zone states into GeoJSON FeatureCollections for Mapbox GL / Leaflet rendering on the frontend.
