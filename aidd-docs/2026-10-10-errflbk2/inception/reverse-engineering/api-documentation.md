# FloodWheel — API Documentation

## Subsystem: `camera-backend` (Port 8001)

### 1. `GET /api/v1/cameras`
- **Description**: Returns paginated list of traffic cameras with coordinates, status, and proxy snapshot URLs.
- **Query Params**:
  - `limit` (default: 50)
  - `offset` (default: 0)
  - `city` (default: "hcmc")
  - `district` (optional)
  - `status` (default: "ALL", options: "UP", "DOWN", "ALL")
  - `keyword` (optional)
  - `bbox` (optional)
- **Response**: `200 OK` JSON `CameraListResponse`.

### 2. `GET /api/v1/cameras/{id}/snapshot`
- **Description**: Returns binary image (JPEG) of the current camera snapshot.
- **Query Params**:
  - `w`: Optional desired width (e.g. 640).
  - `h`: Optional desired height (e.g. 360).
  - `force`: Boolean flag to bypass Redis and disk read cache to trigger a fresh upstream pull.
- **Headers Returned**:
  - `Content-Type: image/jpeg`
  - `Cache-Control: public, max-age=10`
  - `X-Cache-Hit: true | false`
  - `X-Fallback-Source: none | disk-storage | synthetic`
- **Behavior**:
  - If upstream returns `"IMAGE NOT AVAILABLE"` error placeholder:
    - Return last saved valid image from disk with `X-Fallback-Source: disk-storage`.
    - If no disk image exists: return synthetic CCTV frame with `X-Fallback-Source: synthetic`.
  - If upstream returns valid image:
    - Save to disk `storage/snapshots/{id}.jpg`.
    - Save to Redis.
    - Return `200 OK` with `X-Fallback-Source: none`.

### 3. `POST /api/v1/cameras/sync`
- **Description**: Triggers manual catalog refresh from municipal AjaxPro endpoint.
- **Response**: `200 OK` JSON `ProviderSyncResult`.

### 4. `GET /health`
- **Description**: Health status of providers, Redis connection, and disk storage availability.
