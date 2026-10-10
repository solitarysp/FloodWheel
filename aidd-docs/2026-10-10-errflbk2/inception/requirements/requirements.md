# FloodWheel — Requirements Specification

## 1. Functional Requirements (FR)

### FR-01: Multi-Factor Error Placeholder Detection
- **FR-01.1**: The system must inspect binary snapshot payloads returned by municipal endpoints before accepting or caching them.
- **FR-01.2**: If the payload matches any of the known error signatures:
  - Exact MD5 hash match (`9653ea117b2c39d4c477b0949f95860e`).
  - Exact SHA256 hash match (`44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba`).
  - PNG magic bytes (`\x89PNG\r\n\x1a\n`) with file size `< 6000` bytes (since live municipal CCTV frames are real JPEGs starting with `\xff\xd8\xff`).
  - Corrupt or truncated image data (`< 500` bytes).
  the system must flag the payload as `INVALID_PLACEHOLDER`.
- **FR-01.3**: Payloads flagged as `INVALID_PLACEHOLDER` must NEVER be written to disk storage or written to the Redis cache.

### FR-02: Persistent Local Snapshot Storage
- **FR-02.1**: The system must store valid snapshot images to local disk at `storage/snapshots/{camera_id}.jpg`.
- **FR-02.2**: Writes to disk must be performed asynchronously and non-blocking using `aiofiles` or thread executors to prevent blocking the FastAPI event loop.
- **FR-02.3**: Disk writes must use atomic temporary file replacement (`.tmp` write then `replace`) to avoid corrupted partial reads.
- **FR-02.4**: The storage directory path must be configurable via `SNAPSHOT_STORAGE_DIR` setting with default `storage/snapshots`.

### FR-03: Last-Known-Good Fallback Retrieval
- **FR-03.1**: When an upstream municipal request fails due to network timeout, HTTP error, or returns an `INVALID_PLACEHOLDER`, the system must attempt to load the stored image from disk for that camera ID.
- **FR-03.2**: If a valid snapshot exists on disk, the system must serve it with HTTP 200 and header `X-Fallback-Source: disk-storage`.
- **FR-03.3**: If no valid snapshot exists on disk for that camera (cold start or newly added camera), the system must generate a synthetic CCTV fallback frame and return it with header `X-Fallback-Source: synthetic`.

### FR-04: Sub-Millisecond Retrieval Flow
- **FR-04.1**: Standard requests check Redis first. If Redis has a valid cached frame, return immediately (`X-Cache-Hit: true`).
- **FR-04.2**: If Redis misses, attempt external fetch. If external fetch succeeds with valid frame, save to disk and Redis, and return.
- **FR-04.3**: If external fetch fails or returns placeholder, fall back to disk image, populate Redis with short TTL (e.g. 5s), and return.

---

## 2. Non-Functional Requirements (NFR)

### NFR-01: Performance & Latency
- Image validation check must execute in under **1 millisecond** per payload.
- Serving a fallback from disk must take less than **5 milliseconds**.

### NFR-02: High Availability & Zero Interruption
- The frontend client must never receive a broken 500/502 response or broken image thumbnail when upstream cameras fluctuate.

### NFR-03: Storage Efficiency & Safety
- Storing one file per camera for ~800 cameras takes at most ~50 MB of disk space.
- Atomic file operations ensure no half-written or corrupted JPEG files can exist on disk.
