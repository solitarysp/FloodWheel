# Stage 4 — User Stories: Requirements & Acceptance Criteria

## US-CAM-001: Extensible Provider Registry & Microservice Scaffolding
**As a** system architect,  
**I want** a dedicated FastAPI microservice with a modular `BaseCameraProvider` interface,  
**So that** new municipal or private camera networks can be integrated without modifying core routing or caching logic.

### Acceptance Criteria:
- **Given** the `camera-backend` microservice is running on port `8001`,
- **When** an HTTP GET is sent to `/api/v1/health`,
- **Then** the service returns `200 OK` with JSON reporting service health, registered providers, and Redis connection state.
- **Given** an invalid or unknown provider name in `/api/v1/providers/{name}/sync`,
- **When** the sync endpoint is triggered,
- **Then** the service returns HTTP `404 Not Found` with a descriptive error message.

---

## US-CAM-002: Ho Chi Minh City Provider & Catalog Synchronization
**As a** flood monitoring specialist,  
**I want** the system to automatically synchronize and index all ~800 traffic cameras from HCMC's municipal transportation portal,  
**So that** the complete metropolitan camera network is immediately searchable and filterable.

### Acceptance Criteria:
- **Given** the `HCMCCameraProvider` is configured with portal URL `https://giaothong.hochiminhcity.gov.vn`,
- **When** a catalog synchronization is executed,
- **Then** the provider obtains valid `.VDMS` session cookies, queries the AjaxPro endpoint, parses DataTable structures, and extracts camera entities with valid names, codes, districts, and WGS84 coordinates.
- **Given** client requests to `GET /api/v1/cameras?city=hcmc&district=Bình%20Thạnh`,
- **When** filtered by district,
- **Then** only cameras within Binh Thanh district are returned with `200 OK` and accurate metadata.

---

## US-CAM-003: Real-Time Snapshot Streaming with Redis TTL Caching
**As a** FloodWheel AI engine,  
**I want** to stream fresh JPEG camera snapshots through `GET /api/v1/cameras/{id}/snapshot` with automated caching,  
**So that** high-concurrency requests do not overload municipal servers or trigger rate limiting.

### Acceptance Criteria:
- **Given** a valid camera ID in HCMC,
- **When** the snapshot endpoint is requested for the first time,
- **Then** the provider fetches the JPEG from port `8007`, caches the binary payload in Redis with a 10s TTL, and returns HTTP `200 OK` with `Content-Type: image/jpeg` and `X-Cache: MISS`.
- **Given** subsequent snapshot requests for the same camera ID within 10 seconds,
- **When** the snapshot endpoint is queried,
- **Then** the binary payload is delivered from Redis cache with response time `< 25ms` and `X-Cache: HIT`.
- **Given** an upstream municipal connection timeout or downtime,
- **When** a snapshot is requested,
- **Then** the service gracefully returns a synthetic CCTV frame with timestamp overlay instead of crashing or returning HTTP 500.

---

## US-CAM-004: Upstream Core Backend Integration
**As a** FloodWheel core backend developer,  
**I want** `CameraServiceClient` in the main backend (`:8000`) to query `camera-backend:8001`,  
**So that** existing endpoints (`/cameras`, `/snapshot`, `/analyze`) seamlessly utilize the municipal camera network.

### Acceptance Criteria:
- **Given** the main FloodWheel backend is running,
- **When** a user clicks "Capture & Analyze" on any HCMC camera on the frontend,
- **Then** the main backend fetches the snapshot from `camera-backend`, passes it to Gemini Vision AI (VLRDR), and returns depth readings and vehicle passability assessments.
- **Given** `camera-backend` is temporarily offline,
- **When** the main backend calls `CameraServiceClient`,
- **Then** a graceful fallback is returned without throwing unhandled exceptions to the client.
