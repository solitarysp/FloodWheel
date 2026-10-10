# Stage 2 — Reverse Engineering: Code Structure

## 1. Reference Script Structure (`hcmc_traffic_cameras.py`)
- **File**: `/Users/le.van.thanh/Documents/project/untitled folder/tep/hcmc_traffic_cameras.py` (427 lines)
- **Key Modules**:
  - `HCMCTrafficCameraClient`:
    - `__init__(user_agent)`: Initial session creation with desktop Chrome headers.
    - `init_session()`: Synchronous `requests.get` to `https://giaothong.hochiminhcity.gov.vn/map.aspx` to obtain `.VDMS` and `ASP.NET_SessionId`.
    - `_clean_ajaxpro_response(text)`: Stack-based string scanner parsing `new Ajax.Web.DataTable(...)` into JSON.
    - `get_cameras()`: POST to `FolderAjax,VDMS.Web.Library.ashx` with `layer: ["CAMERA"]`, extracting coordinates via regex `POINT\s*\(\s*([\d\.]+)\s+([\d\.]+)\s*\)`.
    - `search_cameras(keyword)`: Filter in-memory by name, code, district.
    - `get_snapshot(camera_id, width, height)`: GET to port `8007` `/Render/CameraHandler.ashx`.
  - **Limitations of Reference Script**:
    - Synchronous blocking `requests` library (unsuitable for concurrent microservices).
    - Session cookies expire after a few minutes, causing unhandled 403 / `User is not authenticated` exceptions without automatic re-authentication.
    - Lacks structured REST interfaces, health checks, Redis caching, or Docker containerization.

## 2. Existing FloodWheel Backend Structure
- **Path**: `backend/app/`
- **Current Modules**:
  - `main.py`: Registers routers under `/api/v1` (`/cameras`, `/flood`, `/analyze`, `/route`, `/health`, `/admin`).
  - `routers/cameras.py`: Handles `GET /cameras`, `GET /cameras/{id}`, `GET /cameras/{id}/snapshot`, `POST /cameras/{id}/analyze`.
  - `services/camera_stream_service.py`: Current in-memory frame puller with 5s TTL and synthetic mock generator.
  - `services/camera_registry.py`: SQLAlchemy CRUD on `cameras` table in PostgreSQL.
  - `models/db_models.py`: `Camera`, `FloodZone`, `FloodReadingDB`.

## 3. New Microservice Structure (`camera-backend/`)
```
camera-backend/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI application initialization & lifecycle
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    # Environment settings (PORT, REDIS_URL, SYNC_INTERVAL)
│   │   └── security.py                  # SSRF prevention & request sanitization
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py                      # BaseCameraProvider abstract interface
│   │   └── hcmc.py                      # HCMCCameraProvider (async HTTPX, auto-cookie renewal)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── cache_service.py             # Redis client with fallbacks for snapshots & cookies
│   │   └── catalog_service.py           # Provider registry, catalog storage, and sync worker
│   ├── models/
│   │   ├── __init__.py
│   │   └── camera.py                    # Unified Pydantic schemas (CameraDTO, FilterQuery)
│   └── api/
│       ├── __init__.py
│       └── v1/
│           ├── __init__.py
│           ├── router.py                # Sub-router aggregation
│           └── endpoints/
│               ├── cameras.py           # GET /, GET /{id}, GET /{id}/snapshot
│               ├── providers.py         # GET /providers, POST /providers/{name}/sync
│               └── health.py            # GET /health, readiness & liveness
└── tests/
    ├── __init__.py
    ├── test_hcmc_parser.py              # Stack parser unit tests
    └── test_api_endpoints.py            # Test client API tests
```

## 4. Main Backend Integration Touchpoints
- New Service Client: `backend/app/services/camera_service_client.py` using `httpx.AsyncClient` pointing to `CAMERA_BACKEND_URL` (default: `http://camera-backend:8001` or `http://localhost:8001`).
- Enhanced Router: `backend/app/routers/cameras.py` delegates live queries and snapshot fetching to `CameraServiceClient` while preserving existing database relationships with `FloodZone` and `FloodReadingDB`.
