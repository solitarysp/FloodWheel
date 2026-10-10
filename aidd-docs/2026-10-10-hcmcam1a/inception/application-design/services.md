# Stage 6 — Application Design: Service-Layer Specifications

## 1. `CacheService` Specification
- **Storage Strategy**:
  - Redis connection pool with `decode_responses=False` for image binaries and `decode_responses=True` for cookie strings and catalog JSON.
  - Key Patterns:
    - `camera:snapshot:{camera_id}` -> Binary JPEG bytes (TTL: 10s)
    - `camera:cookies:{provider}` -> JSON string of session cookies (TTL: 900s / 15m)
    - `camera:catalog:{city}` -> Compressed JSON list of cameras (TTL: 21600s / 6h)
- **Degradation / Fallback**:
  - In-memory dict with timestamps and max-size 500 entries if Redis is down or unavailable.

## 2. `CatalogService` Specification
- **Synchronization Lifecycle**:
  - On application startup: If catalog cache is empty, triggers initial `sync_provider("hcmc")` in the background without blocking server startup.
  - Background Periodic Worker: Uses `asyncio.create_task` loop with `asyncio.sleep(SYNC_INTERVAL_SECONDS)` (default: 21600s / 6 hours).
- **Search & Filter Algorithm**:
  - District normalization: Strips "Quận", "Huyện", accents, case-insensitive comparison.
  - Keyword indexing: Inverted index or multi-field substring matching (`name`, `code`, `district`).
  - Spatial Bounding Box Filter:
    - `bbox = [min_lat, min_lng, max_lat, max_lng]`
    - `min_lat <= camera.latitude <= max_lat and min_lng <= camera.longitude <= max_lng`.

## 3. `CameraServiceClient` Specification
- **Client Configuration**:
  - `CAMERA_BACKEND_URL`: Injected via environment variable (default: `http://camera-backend:8001` in Docker, `http://localhost:8001` locally).
  - Timeout: 5.0 seconds for metadata queries, 8.0 seconds for snapshot streams.
- **Fail-Safe Mechanism**:
  - If `camera-backend` fails to connect or times out, logs warning and invokes `CameraStreamService.generate_mock_frame(camera_id, camera_name)`.
  - Ensures the user interface and AI analysis never crash with an uncaught 500 error.
