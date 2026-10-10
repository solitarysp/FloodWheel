# Stage 6 — Application Design: Component Specifications

## 1. Component Registry

### C1: `CameraApp` (`camera-backend/app/main.py`)
- **Type**: FastAPI Application Factory
- **Responsibilities**:
  - Initializes FastAPI application with metadata, OpenAPI documentation, and CORS middleware.
  - Manages application lifespan (`@asynccontextmanager`): initializes Redis connection pool, registers camera providers, triggers initial catalog sync on startup, and cleanly shuts down connections.

### C2: `HCMCCameraProvider` (`camera-backend/app/providers/hcmc.py`)
- **Type**: Modular Provider Implementation
- **Responsibilities**:
  - Encapsulates network communication with `giaothong.hochiminhcity.gov.vn`.
  - Performs asynchronous handshake with `/map.aspx` to obtain session cookies (`.VDMS`, `ASP.NET_SessionId`).
  - Executes AjaxPro `SearchQuery` request to `FolderAjax,VDMS.Web.Library.ashx`.
  - Parses JavaScript `DataTable` response using stack token scanner and regex coordinate extractor.
  - Fetches JPEG frames from port `8007` `/Render/CameraHandler.ashx`.
  - Detects authentication failures and triggers automated re-authentication.

### C3: `CacheService` (`camera-backend/app/services/cache_service.py`)
- **Type**: Caching & Session Storage Service
- **Responsibilities**:
  - Interfaces with Redis (`redis.asyncio`).
  - Stores binary JPEG snapshots with 10s TTL (`snapshot:{camera_id}`).
  - Stores provider session cookies with 15m TTL (`cookies:hcmc`).
  - Provides in-memory LRU fallback if Redis is temporarily unreachable.

### C4: `CatalogService` (`camera-backend/app/services/catalog_service.py`)
- **Type**: Catalog Aggregator & Query Engine
- **Responsibilities**:
  - Maintains registry of `BaseCameraProvider` instances.
  - Holds indexed camera list with in-memory fast lookups.
  - Implements search filters (city, district, keyword, bounding box, status, pagination).
  - Background worker running periodic catalog sync (every 6 hours).

### C5: `CamerasRouter` (`camera-backend/app/api/v1/endpoints/cameras.py`)
- **Type**: HTTP Controller
- **Responsibilities**:
  - Handles `GET /api/v1/cameras` with query parameters.
  - Handles `GET /api/v1/cameras/{id}`.
  - Handles `GET /api/v1/cameras/{id}/snapshot` with streaming response and cache headers.

### C6: `CameraServiceClient` (`backend/app/services/camera_service_client.py`)
- **Type**: Core Backend Adapter
- **Responsibilities**:
  - Communicates asynchronously from FloodWheel's core backend (`:8000`) to `camera-backend:8001`.
  - Fetches camera lists, details, and binary snapshot streams.
  - Implements circuit breaker and fallback to synthetic CCTV frames if the microservice is down.
