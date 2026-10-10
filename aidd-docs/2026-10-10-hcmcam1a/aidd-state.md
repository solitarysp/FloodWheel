# FloodWheel — AI-DD State

## Project
- **Name**: FloodWheel
- **Session ID**: 2026-10-10-hcmcam1a
- **Type**: Brownfield
- **Created**: 2026-10-10T14:35:00+07:00
- **Status**: INCEPTION_IN_PROGRESS

## Current Phase
- **Phase**: Construction ✅ COMPLETE
- **Current Stage**: All Phases & Units of Work Completed
- **Status**: ALL_PHASES_COMPLETED

## Construction Roadmap & Execution Progress
| Phase | Scope | Units of Work | Points | Status |
|---|---|---|---|---|
| **Phase 1** | Microservice Scaffolding & Provider Engine | UOW-CAM-001 → UOW-CAM-003 | 11 pts | ✅ Complete |
| **Phase 2** | Catalog Management & REST Endpoints | UOW-CAM-004 → UOW-CAM-005 | 9 pts | ✅ Complete |
| **Phase 3** | Core Backend Integration & Verification | UOW-CAM-006 → UOW-CAM-007 | 8 pts | ✅ Complete |

**Total Progress**: 7 / 7 Units of Work Completed (28 / 28 Story Points — 100%)

## Deliverables Summary
1. `camera-backend` Microservice (`camera-backend/`):
   - `Dockerfile`, `requirements.txt`, `.dockerignore`, `app/core/config.py`.
   - `docker-compose.yml`: Added `camera-backend` on port `8001` connected to `floodwheel-network`.
2. HCMC Municipal Camera Provider (`camera-backend/app/providers/hcmc.py`):
   - Asynchronous HTTPX client scraper with automatic `.VDMS` session cookie renewal.
   - Stack-based parser converting AjaxPro DataTable JavaScript syntax to valid JSON.
   - Extraction of ~800 cameras with WGS84 coordinates from `POINT(lng lat)`.
   - Live JPEG snapshot streaming from port `8007` with high-contrast synthetic CCTV fallback.
3. Cache Service (`camera-backend/app/services/cache_service.py`):
   - Redis snapshot binary caching (10s TTL) and session cookie persistence (15m TTL) with in-memory fallback.
4. Catalog Engine (`camera-backend/app/services/catalog_service.py`):
   - Fast in-memory indexed query engine with district, keyword, bounding box, status filters.
   - Background catalog synchronization worker running every 6 hours.
5. REST Controllers (`camera-backend/app/api/v1/endpoints/`):
   - `GET /api/v1/cameras` (paginated, multi-filtered list).
   - `GET /api/v1/cameras/{id}` (camera metadata).
   - `GET /api/v1/cameras/{id}/snapshot` (JPEG image stream with cache headers).
   - `POST /api/v1/providers/{name}/sync` (on-demand synchronization).
   - `GET /api/v1/health` (readiness and provider telemetry).
6. Core Backend Client Adapter (`backend/app/services/camera_service_client.py`):
   - HTTP client adapter consuming `camera-backend:8001` with circuit breaker and fallback.
   - Integrated into `backend/app/routers/cameras.py` to aggregate municipal and local cameras.
7. Verification & Tests:
   - AST syntax validation across all Python files passed with 0 errors.
   - Unit tests in `camera-backend/tests/test_hcmc_parser.py`, `camera-backend/tests/test_catalog_and_api.py`, and `backend/tests/test_camera_service_integration.py`.

## Stage Progression
| Stage | Description | Status |
|---|---|---|
| Stage 1 | Workspace Detection & Mode Selection | ✅ Complete |
| Stage 2 | Reverse Engineering | ✅ Complete |
| Stage 3 | Requirements Analysis | ✅ Complete |
| Stage 4 | User Stories | ✅ Complete |
| Stage 5 | Workflow Planning | ✅ Complete |
| Stage 6 | Application Design | ✅ Complete |
| Stage 7 | Units Generation | ✅ Complete |
| ★ Baseline | Detailed Design Baseline | ✅ Complete |

## Inception Target Scope
1. **Dedicated Camera Backend Microservice (`camera-backend`)**:
   - Standalone FastAPI microservice on port `8001`.
   - Multi-provider extensible architecture (`BaseCameraProvider` interface).
   - Provider #1: **Ho Chi Minh City Traffic Cameras** (`HCMCCameraProvider`), extracting ~800 public cameras via `giaothong.hochiminhcity.gov.vn` AjaxPro SearchQuery and live snapshot proxying via CameraHandler on port `8007`.
2. **Metadata Catalog & Caching**:
   - Periodic background synchronization of camera catalog into local database/cache.
   - Redis-backed snapshot caching (5-15s TTL) and session cookie auto-renewal (`.VDMS`, `ASP.NET_SessionId`).
3. **Upstream Integration with Existing Backend**:
   - Clean REST API contracts exposed by `camera-backend`:
     - `GET /api/v1/cameras` (filtering by city, district, keyword, bounding box, status)
     - `GET /api/v1/cameras/{id}` (full metadata)
     - `GET /api/v1/cameras/{id}/snapshot` (JPEG proxy with caching)
     - `POST /api/v1/providers/hcmc/sync` (catalog synchronization)
     - `GET /api/v1/providers` & `GET /api/v1/health`
   - Adapter / Client in main `backend` (`CameraServiceClient`) to seamlessly consume cameras and snapshots for flood depth analysis and the live web map.
