# Code Structure — FloodWheel

## Repository Layout

```
FloodWheel/
├── backend/
│   ├── app/
│   │   ├── config.py                  # Pydantic BaseSettings & environment variables
│   │   ├── main.py                    # FastAPI entrypoint & lifespan management
│   │   ├── db/                        # Database session, migrations, and seeding
│   │   ├── middleware/                # Auth, metrics, rate limiting
│   │   ├── models/                    # Pydantic schemas and SQLAlchemy DB models
│   │   ├── routers/
│   │   │   ├── admin.py               # Admin authentication, telemetry, queue control
│   │   │   ├── analyze.py             # Single-image flood depth inference
│   │   │   ├── cameras.py             # Camera catalog, stream, and snapshot proxies
│   │   │   ├── flood.py               # Flood zones, heatmap, and readings
│   │   │   ├── health.py              # Health check endpoints
│   │   │   └── route.py               # Safe routing algorithm based on inundation
│   │   └── services/
│   │       ├── camera_service_client.py  # HTTP client to camera-backend microservice
│   │       ├── camera_stream_service.py  # Snapshot acquisition, disk cache, mock generator
│   │       ├── flood_analysis_service.py # End-to-end single and batch flood analysis
│   │       ├── flood_queue_service.py    # 30-minute cyclical scheduler and worker loop
│   │       ├── gemini_client.py          # Google Gemini Vision API client & concurrency lock
│   │       ├── image_validator.py        # Frame validation & placeholder detection
│   │       └── zone_aggregator.py        # PostGIS spatial zone depth calculator
├── camera-backend/
│   ├── app/
│   │   ├── main.py                    # Microservice entrypoint on port 8001
│   │   ├── providers/hcmc.py          # Municipal CCTV scraping & snapshot proxying
│   │   └── services/storage_service.py# Persistent snapshot disk storage
├── frontend/
│   ├── components/                    # UI Components (CameraCard, AddCameraModal, etc.)
│   ├── lib/auth.ts                    # JWT token storage and authenticated fetch helpers
│   ├── pages/
│   │   ├── admin.tsx                  # Admin Portal (Queue, Cameras, Overrides, Alerts)
│   │   ├── cameras.tsx                # CCTV Grid and Interactive Map views
│   │   └── index.tsx                  # Public Map and Flood Depth Dashboard
│   └── styles/globals.css             # Tailwind and Leaflet custom stylesheets
├── docker-compose.yml                 # Multi-container orchestration
└── aidd-docs/                         # AI-DD Inception and session documentation
```
