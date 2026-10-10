# FloodWheel — Application Design: Components

## 1. Component Registry

### `ImageValidator` (`app/services/image_validator.py`)
- Purpose: Classifies raw image payloads received from municipal endpoints as valid CCTV frames or invalid error banners.
- Known Signatures:
  - MD5: `9653ea117b2c39d4c477b0949f95860e`
  - SHA256: `44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba`
  - PNG magic bytes: `\x89PNG\r\n\x1a\n` with size `< 6000` bytes.

### `SnapshotStorageService` (`app/services/storage_service.py`)
- Purpose: Manages persistent file operations for camera snapshots under `storage/snapshots/`.
- File Path Pattern: `{storage_dir}/{camera_id}.jpg`.
- Guarantees: Atomic writes via `.tmp` staging files, non-blocking I/O, path sanitization preventing directory traversal.

### `HCMCCameraProvider` (`app/providers/hcmc.py`)
- Purpose: Scrapes municipal endpoints, uses `ImageValidator` to check frame validity, and coordinates fallback loading.

### `CatalogService` (`app/services/catalog_service.py`)
- Purpose: Manages multi-level caching (Redis -> Disk Storage -> External fetch -> Fallback) and invokes storage writes.
