# FloodWheel — Detailed Design Baseline

## 1. Executive Summary
- **Session ID**: `2026-10-10-errflbk2`
- **Scope**: Snapshot Error Placeholder Detection & Persistent Disk Storage Fallback
- **Status**: BASELINED 🟢
- **Mode**: Autonomous Mode (Auto-Approve & Auto-Resolve)

## 2. Problem Statement
The municipal traffic portal for Ho Chi Minh City (`giaothong.hochiminhcity.gov.vn:8007`) periodically responds to camera snapshot queries with an error banner image: a 5,192-byte PNG image containing the text "IMAGE NOT AVAILABLE" (MD5: `9653ea117b2c39d4c477b0949f95860e`, SHA256: `44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba`).
The previous implementation accepted this response as valid, cached it in Redis, and displayed it to users. Furthermore, without disk persistence, offline cameras immediately degenerated into synthetic mock frames rather than retaining recent physical CCTV images.

## 3. Architecture & Design Specification
1. **Error Detection Engine (`ImageValidator`)**:
   - Detects known error placeholder banners via MD5 / SHA256 checksums.
   - Detects header mismatch: PNG magic header (`\x89PNG\r\n\x1a\n`) on JPEG endpoints where file size `< 6000` bytes.
   - Rejects corrupt or truncated frames `< 500` bytes.
   - Guarantees that no error placeholder is ever written to disk or Redis.

2. **Persistent Snapshot Disk Storage (`SnapshotStorageService`)**:
   - Stores valid snapshots at `storage/snapshots/{camera_id}.jpg`.
   - Performs atomic writes using `.tmp` temporary files to prevent corrupted reads.
   - Non-blocking asynchronous I/O (`aiofiles` / `anyio`).

3. **Fallback Retrieval Pipeline (`HCMCCameraProvider` & `CatalogService`)**:
   - Tier 1: Check Redis memory cache (`TTL 10s`).
   - Tier 2: If cache miss, fetch fresh frame from municipal server.
   - Tier 3: If external fetch is valid, save to disk immediately, cache in Redis, and return.
   - Tier 4: If external fetch returns an error placeholder or encounters network timeout:
     - Check local disk storage for that camera's last-known-good frame.
     - If found: return with header `X-Fallback-Source: disk-storage`.
     - If not found (cold start): generate synthetic CCTV frame with `X-Fallback-Source: synthetic`.

## 4. Units of Work
- **UOW-ERR-001**: `ImageValidator` implementation & unit tests.
- **UOW-ERR-002**: `SnapshotStorageService` implementation & unit tests.
- **UOW-ERR-003**: `HCMCCameraProvider`, `CatalogService`, and `CameraRouter` integration.

## 5. Verification Strategy
- **Unit Tests**:
  - Test `ImageValidator` against `sample_error_snapshot.jpeg` and valid JPEG fixtures.
  - Test `SnapshotStorageService` atomic writing, reading, and non-blocking operation.
- **Integration Tests**:
  - Mock municipal endpoint returning error image -> verify disk fallback is returned.
  - Mock municipal endpoint returning valid image -> verify saved to disk.
  - Mock fresh camera with no disk file -> verify synthetic fallback.
