# Stage 7 — Units Generation: Detailed Units of Work (UOW)

## UOW-CAM-001: Microservice Scaffolding & Docker Compose Configuration
- **Phase**: Phase 1
- **Points**: 3 pts
- **Description**: Scaffold the new `camera-backend/` directory structure, `Dockerfile`, `requirements.txt`, `.dockerignore`, `app/core/config.py`, and register the `camera-backend` service in `docker-compose.yml` on port `8001` attached to `floodwheel-network`.
- **Target Files**:
  - `camera-backend/Dockerfile`
  - `camera-backend/requirements.txt`
  - `camera-backend/.dockerignore`
  - `camera-backend/app/__init__.py`
  - `camera-backend/app/main.py`
  - `camera-backend/app/core/config.py`
  - `docker-compose.yml`
- **Verification Criteria**:
  - `docker-compose config` validates without syntax errors.
  - Container builds and starts cleanly on port 8001.

---

## UOW-CAM-002: Async HCMC Camera Provider & AjaxPro Stack Parser
- **Phase**: Phase 1
- **Points**: 5 pts
- **Description**: Port and refactor `hcmc_traffic_cameras.py` into `HCMCCameraProvider` implementing `BaseCameraProvider`. Implement async HTTPX communication, stack-based `DataTable` JSON parser, regex coordinate extractor (`POINT(lng lat)`), and port 8007 snapshot retrieval.
- **Target Files**:
  - `camera-backend/app/providers/__init__.py`
  - `camera-backend/app/providers/base.py`
  - `camera-backend/app/providers/hcmc.py`
  - `camera-backend/app/models/camera.py`
- **Verification Criteria**:
  - Stack parser successfully converts AjaxPro `new Ajax.Web.DataTable(...)` into valid JSON without parsing errors.
  - Unit tests in `camera-backend/tests/test_hcmc_parser.py` pass with 100% coverage.

---

## UOW-CAM-003: Redis Cache Service & Session Token Manager
- **Phase**: Phase 1
- **Points**: 3 pts
- **Description**: Implement `CacheService` providing async Redis key-value storage for camera snapshots (`snapshot:{id}`, 10s TTL), session cookies (`cookies:hcmc`, 15m TTL), and in-memory LRU fallback when Redis is offline.
- **Target Files**:
  - `camera-backend/app/services/__init__.py`
  - `camera-backend/app/services/cache_service.py`
- **Verification Criteria**:
  - Binary JPEG byte buffers write and read from Redis with correct TTL.
  - Fallback dictionary activates gracefully if Redis connection is mocked offline.

---

## UOW-CAM-004: Camera Catalog Service & Background Synchronization Worker
- **Phase**: Phase 2
- **Points**: 4 pts
- **Description**: Implement `CatalogService` to aggregate provider feeds, maintain an in-memory indexed catalog of ~800 cameras, execute multi-parameter filters (city, district, keyword, bbox, status, pagination), and run periodic background synchronization.
- **Target Files**:
  - `camera-backend/app/services/catalog_service.py`
- **Verification Criteria**:
  - Filtering by district and keyword returns accurate camera subsets.
  - Bounding box filter strictly excludes cameras outside coordinates.
  - Background task triggers sync without blocking API requests.

---

## UOW-CAM-005: REST API Controllers & Health Probes (:8001)
- **Phase**: Phase 2
- **Points**: 5 pts
- **Description**: Implement FastAPI routers for `GET /api/v1/cameras`, `GET /api/v1/cameras/{id}`, `GET /api/v1/cameras/{id}/snapshot`, `POST /api/v1/providers/hcmc/sync`, and `GET /api/v1/health`. Support query parameters, streaming responses, and cache headers.
- **Target Files**:
  - `camera-backend/app/api/__init__.py`
  - `camera-backend/app/api/v1/__init__.py`
  - `camera-backend/app/api/v1/router.py`
  - `camera-backend/app/api/v1/endpoints/cameras.py`
  - `camera-backend/app/api/v1/endpoints/providers.py`
  - `camera-backend/app/api/v1/endpoints/health.py`
- **Verification Criteria**:
  - All endpoints return correct status codes, headers, and schemas matching OpenAPI specifications.
  - Snapshot endpoint returns `image/jpeg` with `Cache-Control: public, max-age=10`.

---

## UOW-CAM-006: Core Backend Adapter (`CameraServiceClient`) & Router Updates
- **Phase**: Phase 3
- **Points**: 5 pts
- **Description**: Implement `CameraServiceClient` in FloodWheel's core backend (`:8000`). Update `backend/app/routers/cameras.py` to forward camera queries, snapshots, and analysis requests to `camera-backend:8001` with circuit breaker and fallback.
- **Target Files**:
  - `backend/app/services/camera_service_client.py`
  - `backend/app/routers/cameras.py`
  - `backend/app/config.py`
- **Verification Criteria**:
  - Core backend `/api/v1/cameras` and `/api/v1/cameras/{id}/snapshot` seamlessly serve data from `camera-backend`.
  - Gemini Vision VLRDR `/analyze` works identically using frames pulled from `camera-backend`.

---

## UOW-CAM-007: Integration Testing & Verification Suite
- **Phase**: Phase 3
- **Points**: 3 pts
- **Description**: Implement automated unit and integration tests across both `camera-backend` and core `backend`, validating multi-service communication, fallback generation, and flood analysis execution.
- **Target Files**:
  - `camera-backend/tests/test_api.py`
  - `camera-backend/tests/test_hcmc_parser.py`
  - `backend/tests/test_camera_service_integration.py`
- **Verification Criteria**:
  - Pytest runs with 0 failures and 0 warnings.
  - End-to-end simulated flow passes from frontend query -> main backend -> camera backend -> mock HCMC server.
