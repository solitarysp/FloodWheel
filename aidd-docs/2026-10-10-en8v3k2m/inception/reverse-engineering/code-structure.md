# FloodWheel — Code Structure & String Inventory

## 1. Directory Tree
```
FloodWheel/
├── aidd-docs/                       # AI-Driven Development documentation & audits
├── backend/
│   ├── app/
│   │   ├── config.py                # Pydantic environment configuration
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── db/
│   │   │   ├── base.py              # SQLAlchemy async engine & declarative base
│   │   │   ├── session.py           # Database session dependency
│   │   │   └── seed_data.py         # [VIETNAMESE STRINGS] Seed zones & CCTV cameras
│   │   ├── middleware/
│   │   │   ├── metrics.py           # Prometheus metrics exporter (/metrics)
│   │   │   └── rate_limiter.py      # IP token bucket rate limiter
│   │   ├── models/
│   │   │   ├── db_models.py         # SQLAlchemy ORM (Camera, FloodZone, FloodReading, Alert)
│   │   │   ├── camera.py            # Pydantic Camera schemas
│   │   │   ├── flood_reading.py     # Pydantic FloodReading schemas
│   │   │   └── zone_status.py       # Pydantic ZoneStatus schemas
│   │   ├── routers/
│   │   │   ├── admin.py             # Admin overrides & manual camera polling triggers
│   │   │   ├── analyze.py           # Core VLRDR image analysis endpoint
│   │   │   ├── cameras.py           # Camera registry and health status
│   │   │   ├── flood.py             # Heatmap & zone status endpoints
│   │   │   ├── health.py            # Liveness and readiness probes
│   │   │   └── route.py             # [VIETNAMESE STRINGS] Waypoint route safety scoring
│   │   └── services/
│   │       ├── camera_registry.py   # Camera discovery and CRUD
│   │       ├── dedup_guard.py       # Cooldown alert deduplication
│   │       ├── flood_reading_parser.py # [VIETNAMESE STRINGS] Fallback error message
│   │       ├── frame_puller.py      # Async HTTP frame downloader
│   │       ├── gemini_client.py     # [VIETNAMESE STRINGS] Mock reasoning & alert strings
│   │       ├── heatmap_builder.py   # GeoJSON polygon builder
│   │       ├── polling_scheduler.py # Background periodic polling task
│   │       ├── privacy_filter.py    # Plate/face blur filter
│   │       ├── push_sender.py       # Browser web push notification dispatcher
│   │       ├── route_scorer.py      # [VIETNAMESE STRINGS] Route safety & detour notes
│   │       ├── threshold_monitor.py # [VIETNAMESE STRINGS] Critical alert message generator
│   │       ├── vlrdr_prompt.py      # [VIETNAMESE STRINGS] Prompt instructions (EN/VI)
│   │       ├── weather_client.py    # Open-Meteo weather client
│   │       ├── webhook_delivery.py  # Dispatcher for partner webhook endpoints
│   │       └── zone_aggregator.py   # [VIETNAMESE STRINGS] Zone active alert tags
│   ├── tests/                       # Pytest unit & integration test suites
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── components/
│   │   ├── AlertSidebar.tsx         # [VIETNAMESE STRINGS] Red Alert zone list & headers
│   │   ├── DemoUpload.tsx           # [VIETNAMESE STRINGS] Upload zones, tabs, submit buttons
│   │   ├── FloodMap.tsx             # [VIETNAMESE STRINGS] Map headers, legends, popup cards
│   │   ├── Navbar.tsx               # [VIETNAMESE STRINGS] Brand title, nav items, status badges
│   │   ├── OverrideDialog.tsx       # [VIETNAMESE STRINGS] Manual override modal inputs & labels
│   │   ├── ResultCard.tsx           # [VIETNAMESE STRINGS] AI depth level tags, landmarks, warnings
│   │   └── ZoneDetailPanel.tsx      # [VIETNAMESE STRINGS] Detailed zone telemetry & advice
│   ├── data/
│   │   └── benchmarkDataset.ts      # [VIETNAMESE STRINGS] 12 benchmark demo images & titles
│   ├── pages/
│   │   ├── _app.tsx                 # [VIETNAMESE STRINGS] Page meta title & description
│   │   ├── dashboard.tsx            # [VIETNAMESE STRINGS] City overview, metrics, hot spots
│   │   ├── demo.tsx                 # [VIETNAMESE STRINGS] Interactive Gemini demo playground
│   │   └── index.tsx                # [VIETNAMESE STRINGS] Hero banner, value props, demo cards
│   ├── styles/
│   │   └── globals.css
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── demo-assets/                     # Sample flood images for offline testing
├── tests/load/                      # Locust performance test scripts
├── docker-compose.yml
└── Makefile
```

## 2. Hardcoded Vietnamese String Breakdown
| Layer | File Path | Vietnamese Strings Found | Target English Transformation |
|---|---|---|---|
| Frontend | `frontend/pages/_app.tsx` | App titles & descriptions | "FloodWheel — Real-Time Urban Flood Depth Intelligence" |
| Frontend | `frontend/pages/index.tsx` | Hero titles, feature cards, call-to-action | Full English conversion of marketing & technical copy |
| Frontend | `frontend/pages/demo.tsx` | Sandbox guide, benchmark selection instructions | Full English conversion for interactive demo |
| Frontend | `frontend/pages/dashboard.tsx` | Municipal dashboard stats, hot spot badges | Full English conversion for operator console |
| Frontend | `frontend/components/Navbar.tsx` | Navigation links, live status indicator | "Live Map", "Gemini Demo", "Operator Dashboard" |
| Frontend | `frontend/components/DemoUpload.tsx` | Drag-and-drop, sample images, submit button | "Analyze Flood Depth (Gemini VLRDR)", English prompts |
| Frontend | `frontend/components/FloodMap.tsx` | Header bar, depth legends, map tooltips | "Real-time Urban Flood Map — Ho Chi Minh City", English legends |
| Frontend | `frontend/components/ResultCard.tsx` | Landmark cards, depth gauge labels, advisories | "Physical Landmarks Identified", "Submersion Analysis" |
| Frontend | `frontend/components/ZoneDetailPanel.tsx` | Passability advice by vehicle type, sensor info | "Impassable for motorbikes", "High clearance required" |
| Frontend | `frontend/components/OverrideDialog.tsx` | Form labels, input placeholders, save buttons | "Override Flood Level (0 - 5)", "Validity Duration (Hours)" |
| Frontend | `frontend/components/AlertSidebar.tsx` | Critical alert cards, zero-alert empty state | "Critical Red Alerts (Level ≥ 3)", "No active flood emergencies" |
| Frontend | `frontend/data/benchmarkDataset.ts` | 12 image titles, locations, and landmark lists | All 12 benchmark metadata items translated to clear English |
| Backend | `backend/app/services/threshold_monitor.py` | Danger alert templates & vehicle warnings | "CRITICAL FLOOD ALERT: {zone} is at Level {level}..." |
| Backend | `backend/app/services/route_scorer.py` | Route safety advisory & detour notes | "Safe route: no severe flood zones detected.", warning notes |
| Backend | `backend/app/services/zone_aggregator.py` | Active alert strings | "Flood Alert: {min}-{max}cm" |
| Backend | `backend/app/services/flood_reading_parser.py` | Fallback AI error messages | "Unable to evaluate flood depth due to AI response formatting error." |
| Backend | `backend/app/services/gemini_client.py` | Offline mock reasoning & alert copy | English mock reasoning describing landmark water contact |
| Backend | `backend/app/services/vlrdr_prompt.py` | Output schema instruction note | Explicitly instruct AI to output reasoning and alerts in English |
| Backend | `backend/app/db/seed_data.py` | Zone and camera descriptive names | English localized names (e.g. "Nguyen Huu Canh Corridor") |
