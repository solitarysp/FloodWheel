# Stage 3 — Requirements: Functional & Non-Functional Specifications

## 1. Functional Requirements (FR)

### FR-CAM-01: Modular Multi-Provider Architecture
- The system shall implement an extensible `BaseCameraProvider` abstract interface.
- Each provider must encapsulate its authentication mechanism, camera catalog extraction, live snapshot rendering, and health check.
- The system must support registration of multiple municipal or private camera providers via a unified provider registry.

### FR-CAM-02: Ho Chi Minh City Camera Provider (`HCMCCameraProvider`)
- The system shall implement `HCMCCameraProvider` as Provider #1 (`city="hcmc"`), connecting to `https://giaothong.hochiminhcity.gov.vn`.
- It shall parse the municipal AjaxPro `FolderAjax.ashx -> SearchQuery` payload to extract approximately 800 cameras across all HCMC districts (District 1, District 3, Binh Thanh, Thu Duc, Go Vap, Tan Binh, etc.).
- It shall parse WGS84 coordinates from the `Shape` attribute (`POINT(lng lat)`), extracting latitude and longitude with 5 decimal precision.
- It shall extract camera identifiers (`CamId`), street names (`DisplayName`/`Title`), codes (`Code`), status (`UP`/`DOWN`), district (`District`), PTZ capability, and live streaming links (`VideoUrl`).

### FR-CAM-03: Asynchronous Session & Cookie Auto-Renewal
- The provider shall maintain valid session cookies (`.VDMS`, `ASP.NET_SessionId`, `_frontend`, `TS01e7700a`) by querying `/map.aspx`.
- The system shall automatically detect session expiration (HTTP 401/403 or `"User is not authenticated"`), invalidate cached cookies, re-authenticate immediately with a lock to avoid stampedes, and retry the failed request.

### FR-CAM-04: Camera Catalog Query & Filter APIs
- The microservice shall expose `GET /api/v1/cameras` supporting:
  - Filtering by `city` (default: `"hcmc"`).
  - Filtering by `district` (case-insensitive substring or exact match).
  - Filtering by `keyword` (search across name, code, location).
  - Filtering by geographic bounding box `bbox=min_lat,min_lng,max_lat,max_lng`.
  - Filtering by `status` (`"UP"`, `"DOWN"`).
  - Pagination via `limit` (default 50, max 1000) and `offset`.
- The microservice shall expose `GET /api/v1/cameras/{id}` returning complete camera telemetry.

### FR-CAM-05: Live Snapshot Streaming with Redis TTL Caching
- The microservice shall expose `GET /api/v1/cameras/{id}/snapshot` delivering binary `image/jpeg` payload directly to callers.
- Images shall be cached in Redis with a configurable TTL (default: 10 seconds).
- Image dimension parameters `w` (width) and `h` (height) shall optionally resize the snapshot on demand.
- If the upstream government server fails or times out, the service shall return a realistic synthetic CCTV frame with telemetry overlay to maintain UI stability.

### FR-CAM-06: Main Backend Integration Adapter
- The existing FloodWheel backend (`:8000`) shall incorporate `CameraServiceClient`.
- Existing endpoints `/api/v1/cameras`, `/api/v1/cameras/{id}`, `/api/v1/cameras/{id}/snapshot`, and `/api/v1/cameras/{id}/analyze` shall seamlessly query `camera-backend:8001`.
- The Gemini Vision flood depth analysis pipeline shall directly analyze snapshots provided by `camera-backend`.

### FR-CAM-07: Docker Compose Orchestration & Health Monitoring
- `docker-compose.yml` shall include the `camera-backend` service running on port `8001`, connected to `floodwheel-network`, depending on `redis`.
- The service shall expose `GET /api/v1/health` reporting service status, active providers, cached camera counts, and Redis connectivity.

---

## 2. Non-Functional Requirements (NFR)

### NFR-CAM-01: Performance & Latency
- Camera catalog queries served from local storage shall respond in `< 15ms` (P95).
- Cached snapshot responses from Redis shall respond in `< 25ms` (P95).
- Uncached snapshot fetches from external government servers shall have a strict timeout of `8.0s`.

### NFR-CAM-02: Resilience & High Availability
- Background catalog synchronization failures shall not disrupt previously cached or stored camera metadata.
- Redis disconnection shall gracefully degrade to an in-memory LRU cache without crashing the service.
- The service shall achieve 99.9% availability for API consumers by serving synthetic CCTV fallbacks when upstream municipal streams are offline.

### NFR-CAM-03: Security & Network Hygiene
- Zero SSRF vulnerability: All upstream URLs are strictly validated against private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1/8`).
- All incoming inputs (bounding box coordinates, camera IDs, district strings) shall be strictly validated using Pydantic schemas.

### NFR-CAM-04: Extensibility
- Adding a new city provider (e.g., Da Nang, Hanoi, or custom camera networks) shall require only subclassing `BaseCameraProvider` and registering it in `CatalogService` without modifying core routing or caching logic.
