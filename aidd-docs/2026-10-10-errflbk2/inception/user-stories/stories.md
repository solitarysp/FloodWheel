# FloodWheel — User Stories & Acceptance Criteria

## Story US-01: Shielding Against Error Placeholders
- **As a** commuter checking live traffic conditions,
- **I want** the system to detect and filter out "IMAGE NOT AVAILABLE" banners,
- **So that** I am not presented with useless error screens on the map.

### Acceptance Criteria:
1. `ImageValidator` identifies payloads matching the exact MD5/SHA256 of the error placeholder or PNG header mismatch.
2. The error placeholder is never stored to disk or Redis.

---

## Story US-02: Persistent Snapshot Caching on Disk
- **As a** backend engineer,
- **I want** valid camera frames to be saved as local files on disk,
- **So that** subsequent requests can be served instantly without repeated external network traffic.

### Acceptance Criteria:
1. When a valid frame is fetched, it is written to `storage/snapshots/{camera_id}.jpg`.
2. Disk writes are atomic and non-blocking.
3. The file path is verified to exist and contain valid JPEG data.

---

## Story US-03: Last-Known-Good Historical Fallback
- **As a** commuter looking at a camera whose upstream feed dropped out,
- **I want** to see the last valid image captured for that camera,
- **So that** I can still evaluate recent road conditions.

### Acceptance Criteria:
1. When upstream returns an error placeholder or times out, the service loads the disk snapshot for that camera.
2. The response includes `X-Fallback-Source: disk-storage`.
3. If no disk snapshot exists, a synthetic frame is returned with `X-Fallback-Source: synthetic`.
