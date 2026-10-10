# FloodWheel — Functional Specification Document (FSD)

## 1. Scope & Objective
This specification defines the functional behavior of the snapshot validation, disk persistence, and fallback pipeline in `camera-backend`.

## 2. Process Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant API as Camera Router (/snapshot)
    participant Catalog as CatalogService
    participant Cache as Redis Cache
    participant Provider as HCMCCameraProvider
    participant Validator as ImageValidator
    participant Storage as SnapshotStorageService
    participant Upstream as HCMC Municipal Server

    Client->>API: GET /api/v1/cameras/{id}/snapshot
    API->>Catalog: get_snapshot(camera_id, force=False)
    Catalog->>Cache: get_snapshot(camera_id)
    alt Cache Hit (Valid JPEG in Redis)
        Cache-->>Catalog: Return cached bytes
        Catalog-->>Client: 200 OK (image/jpeg, X-Cache-Hit: true)
    else Cache Miss
        Catalog->>Provider: get_snapshot(camera_id)
        Provider->>Upstream: GET CameraHandler.ashx?id={camera_id}
        Upstream-->>Provider: Raw payload (bytes)
        Provider->>Validator: is_valid_snapshot(payload)
        
        alt Valid Live Frame
            Validator-->>Provider: VALID (True)
            Provider-->>Catalog: Live frame bytes
            Catalog->>Storage: save_snapshot(camera_id, bytes)
            Catalog->>Cache: set_snapshot(camera_id, bytes, ttl=10s)
            Catalog-->>Client: 200 OK (image/jpeg, X-Fallback-Source: none)
        else Invalid / Error Placeholder / Upstream Timeout
            Validator-->>Provider: INVALID (False)
            Provider->>Storage: get_snapshot(camera_id)
            alt Snapshot Exists on Disk
                Storage-->>Provider: Stored JPEG bytes
                Provider-->>Catalog: Stored JPEG bytes (is_fallback=True)
                Catalog->>Cache: set_snapshot(camera_id, bytes, ttl=5s)
                Catalog-->>Client: 200 OK (image/jpeg, X-Fallback-Source: disk-storage)
            else No Snapshot on Disk (Cold Start)
                Provider->>Provider: generate_mock_frame(camera_id)
                Provider-->>Catalog: Synthetic frame bytes
                Catalog-->>Client: 200 OK (image/jpeg, X-Fallback-Source: synthetic)
            end
        end
    end
```

## 3. Storage Layer Specifications
- **Root Directory**: `storage/snapshots/` inside `camera-backend` container.
- **File Naming**: `{sanitized_camera_id}.jpg`.
- **Concurrency**: Write operations utilize temporary files (`{sanitized_camera_id}.tmp`) before atomically renaming to target `.jpg`.
- **Integrity Check**: On read, bytes are verified to have JPEG magic prefix (`\xff\xd8`).
