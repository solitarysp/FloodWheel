# FloodWheel — Requirements Verification Questions

## Context
During Autonomous Inception, key design inquiries were formulated and resolved based on user prompt analysis and real-world image artifacts:

### Question 1: How should "IMAGE NOT AVAILABLE" placeholders be detected?
- **Options Evaluated**:
  1. OCR text extraction with Tesseract.
  2. Multi-factor signature matching (MD5/SHA256 hash match, PNG magic header mismatch on JPEG endpoints, payload size < 6KB).
  3. Simple byte size threshold check (< 6KB).
- **Resolution**: Option 2 (Multi-factor signature matching). OCR introduces substantial CPU overhead, external binary dependencies, and 100ms+ latency per frame. Signature matching is sub-millisecond, 100% deterministic, zero-dependency, and catches known and variant error banners.

### Question 2: How should historical images be stored on disk?
- **Options Evaluated**:
  1. Flat directory structure (`storage/snapshots/{camera_id}.jpg`).
  2. Timestamped subdirectories (`storage/snapshots/{camera_id}/{timestamp}.jpg`).
  3. External S3/MinIO bucket.
- **Resolution**: Option 1 (Flat directory structure `storage/snapshots/{camera_id}.jpg`). The user explicitly requested returning the camera's existing valid image when errors happen and saving it for faster subsequent returns. A flat single-file-per-camera strategy minimizes disk consumption, allows instant O(1) file lookups without directory indexing, and avoids disk exhaustion.

### Question 3: What fallback should be served if upstream fails AND no historical snapshot exists on disk?
- **Options Evaluated**:
  1. Return HTTP 404 / 502 error to client.
  2. Return the municipal error placeholder banner.
  3. Generate and return a synthetic CCTV fallback frame with camera ID and timestamp OSD.
- **Resolution**: Option 3 (Synthetic CCTV fallback frame). Keeps map pins and video feeds visually coherent without breaking frontend rendering or displaying third-party error banners.
