# Component Inventory — FloodWheel

## Core Components & Modules

| Component | File Path | Primary Responsibilities |
|---|---|---|
| `FloodAnalysisQueue` | `backend/app/services/flood_queue_service.py` | Orchestrates 30-minute cyclical scanning; enqueues cameras; runs worker loop; tracks progress; serializes state to Redis. |
| `FloodAnalysisService` | `backend/app/services/flood_analysis_service.py` | Coordinates camera resolution, frame acquisition, placeholder filtering, Gemini VLRDR inference, reading persistence, and zone aggregation. |
| `GeminiClient` | `backend/app/services/gemini_client.py` | Handles Gemini GenAI SDK / legacy SDK invocation, API key pool rotation, concurrency lock (`_analysis_lock`), rate limit spacing, and model fallbacks. |
| `CameraServiceClient` | `backend/app/services/camera_service_client.py` | Consumes `camera-backend:8001` HTTP REST endpoints for camera catalog and snapshot fetching. |
| `CameraStreamService` | `backend/app/services/camera_stream_service.py` | Multi-tier frame resolution: memory cache -> camera-backend -> local disk snapshot -> public URL -> synthetic mock. |
| `AdminRouter` | `backend/app/routers/admin.py` | Handles admin login (`/login`), telemetry overview (`/overview`), queue manual trigger (`/queue/trigger`), pause (`/queue/pause`), resume (`/queue/resume`), and config (`/queue/config`). |
| `AdminPage` | `frontend/pages/admin.tsx` | Admin management portal rendering KPI cards, Queue Control tab, Camera Management tab, Zone Overrides, and Active Alerts. |
| `HCMCCameraProvider` | `camera-backend/app/providers/hcmc.py` | Extracts ~800 cameras from `giaothong.hochiminhcity.gov.vn` and proxies real-time JPEG frames with session cookies. |
