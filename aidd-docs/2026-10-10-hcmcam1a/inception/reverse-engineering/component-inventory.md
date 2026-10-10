# Stage 2 — Reverse Engineering: Component Inventory

## 1. Camera Backend Components (`camera-backend/`)
| Component | Type | Responsibility |
|---|---|---|
| `main.py` | Application Entrypoint | FastAPI factory, CORS middleware, lifespan events (startup sync worker, shutdown cleanup). |
| `config.py` | Configuration Manager | Pydantic BaseSettings loading env vars (`CAMERA_PORT`, `REDIS_URL`, `HCMC_BASE_URL`, `CACHE_TTL`). |
| `BaseCameraProvider` | Abstract Class | Defines contract: `get_cameras()`, `get_snapshot()`, `health_check()`. |
| `HCMCCameraProvider` | Provider Implementation | Asynchronous scraper for `giaothong.hochiminhcity.gov.vn`. Implements cookie auto-renewal and AjaxPro stack parser. |
| `CacheService` | Infrastructure Service | Redis snapshot storage with configurable TTL and in-memory LRU fallback. |
| `CatalogService` | Business Service | Aggregates camera lists across providers, filters by district/geo-bounds, and schedules sync intervals. |
| `cameras.py` (Router) | HTTP Controller | Endpoints for listing, querying, and streaming camera snapshots. |
| `providers.py` (Router) | HTTP Controller | Endpoints for provider status and manual synchronization triggers. |
| `health.py` (Router) | HTTP Controller | Liveness and readiness probes for Docker/Kubernetes orchestration. |

## 2. Core Backend Integration Components (`backend/`)
| Component | Type | Responsibility |
|---|---|---|
| `CameraServiceClient` | HTTP Client Adapter | Async HTTPX client communicating with `camera-backend:8001`, handling connection retries and fallback frames. |
| `routers/cameras.py` | FastAPI Controller | Routes client requests to `CameraServiceClient`, enriching results with flood zone information. |
| `services/gemini_client.py` | AI Service | Executes Gemini 3.8 Flash multimodal prompt on snapshot bytes. |

## 3. Frontend Components (`frontend/`)
| Component | Type | Responsibility |
|---|---|---|
| `CamerasPage` (`pages/cameras.tsx`) | Next.js Page | Displays live camera grid across all districts of HCMC, supporting live search, district filtering, and auto-refresh. |
| `CameraCard` (`components/CameraCard.tsx`) | React Component | Live camera feed tile with status badge, camera code, and "Capture & Analyze" trigger. |
| `CameraAnalysisModal` | React Component | Modal rendering the Gemini VLRDR analysis breakdown (depth cm, level 0-4, passability). |
