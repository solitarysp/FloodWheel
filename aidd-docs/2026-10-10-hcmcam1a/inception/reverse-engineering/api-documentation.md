# Stage 2 — Reverse Engineering: API Documentation

## 1. Camera Backend Microservice API Contracts (`:8001`)

### Endpoint 1: Health & Readiness
- **GET `/api/v1/health`**
  - **Description**: Returns microservice status, active providers, and Redis connection state.
  - **Response 200 OK**:
    ```json
    {
      "status": "healthy",
      "service": "floodwheel-camera-backend",
      "version": "1.0.0",
      "redis_connected": true,
      "providers": {
        "hcmc": {
          "status": "active",
          "cached_cameras_count": 782,
          "last_synced_at": "2026-10-10T14:30:00Z"
        }
      }
    }
    ```

### Endpoint 2: List Cameras with Advanced Filters
- **GET `/api/v1/cameras`**
  - **Query Parameters**:
    - `city` (optional, string, default: `"hcmc"`): Municipal camera provider identifier.
    - `district` (optional, string): District name (e.g., `"Quận 1"`, `"Bình Thạnh"`, `"Thủ Đức"`).
    - `keyword` (optional, string): Free-text search on road name, camera code, or location.
    - `bbox` (optional, string): Bounding box `"min_lat,min_lng,max_lat,max_lng"`.
    - `status` (optional, string): `"UP"`, `"DOWN"`, or `"ALL"`.
    - `limit` (optional, integer, default: 100, max: 1000).
    - `offset` (optional, integer, default: 0).
  - **Response 200 OK**:
    ```json
    {
      "total": 782,
      "limit": 50,
      "offset": 0,
      "items": [
        {
          "id": "662b86c41afb9c00172dd31c",
          "provider": "hcmc",
          "city": "hcmc",
          "name": "Ngã tư Hàng Xanh - Xô Viết Nghệ Tĩnh",
          "code": "CAM_HX_01",
          "district": "Bình Thạnh",
          "latitude": 10.80164,
          "longitude": 106.71182,
          "status": "UP",
          "has_ptz": true,
          "snapshot_url": "/api/v1/cameras/662b86c41afb9c00172dd31c/snapshot",
          "live_video_url": "https://...",
          "updated_at": "2026-10-10T14:30:00Z"
        }
      ]
    }
    ```

### Endpoint 3: Get Camera by ID
- **GET `/api/v1/cameras/{camera_id}`**
  - **Response 200 OK**: Complete camera metadata object.
  - **Response 404 Not Found**: Camera not found.

### Endpoint 4: Get Camera Snapshot Frame
- **GET `/api/v1/cameras/{camera_id}/snapshot`**
  - **Query Parameters**:
    - `w` (optional, integer): Image width resize.
    - `h` (optional, integer): Image height resize.
    - `force_refresh` (optional, boolean, default: `false`).
  - **Response 200 OK**:
    - `Content-Type: image/jpeg`
    - `Cache-Control: public, max-age=10`
    - `X-Cache-Status: HIT` | `MISS`
    - Binary JPEG frame payload.

### Endpoint 5: Manual Provider Catalog Synchronization
- **POST `/api/v1/providers/{provider_name}/sync`**
  - **Description**: Triggers an on-demand catalog refresh from the provider.
  - **Response 200 OK**:
    ```json
    {
      "provider": "hcmc",
      "status": "sync_completed",
      "total_extracted": 782,
      "active_cameras": 765,
      "execution_time_seconds": 2.45
    }
    ```

---

## 2. Core Backend Integration API Updates (`:8000`)
- **GET `/api/v1/cameras`**:
  - Upstream query forwarded to `camera-backend:8001`, merging any existing FloodZone assignments and Gemini flood readings.
- **GET `/api/v1/cameras/{camera_id}/snapshot`**:
  - Direct async stream from `camera-backend:8001`, preserving zero-copy throughput.
- **POST `/api/v1/cameras/{camera_id}/analyze`**:
  - Automatically fetches the active frame from `camera-backend:8001/api/v1/cameras/{id}/snapshot` and runs Gemini VLRDR analysis.
