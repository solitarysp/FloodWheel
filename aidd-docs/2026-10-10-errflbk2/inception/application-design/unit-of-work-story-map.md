# FloodWheel — Unit of Work to User Story Mapping

| User Story | Units of Work | Verification Method |
|---|---|---|
| **US-01: Shielding Against Error Placeholders** | `UOW-ERR-001` | Unit tests matching known MD5/SHA256, PNG header mismatch, and small file rejections. |
| **US-02: Persistent Snapshot Caching on Disk** | `UOW-ERR-002`, `UOW-ERR-003` | Disk write tests asserting file exists at `storage/snapshots/{camera_id}.jpg` and matches original binary. |
| **US-03: Last-Known-Good Historical Fallback** | `UOW-ERR-003` | Integration tests verifying that when upstream returns an error placeholder, the cached disk image is served with `X-Fallback-Source: disk-storage`. |
