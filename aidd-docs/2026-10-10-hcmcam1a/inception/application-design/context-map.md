# Stage 6 — Application Design: Context Map

## 1. Bounded Contexts

```mermaid
flowchart LR
    subgraph Context1 ["Camera Ingestion Bounded Context (camera-backend)"]
        direction TB
        CatalogDomain["Camera Catalog & Metadata"]
        SnapshotDomain["Snapshot Streaming & Caching"]
        ProviderDomain["Municipal Provider Integrations (HCMC)"]
    end

    subgraph Context2 ["Flood Intelligence Bounded Context (main backend)"]
        direction TB
        FloodModel["Flood Depth Regression (VLRDR)"]
        ZoneModel["Municipal Flood Zones & Risk"]
        RoutingModel["Flood-Safe Navigation Engine"]
    end

    Context1 -->|Upstream / Downstream (REST / OpenAPI)| Context2
```

## 2. Context Relationships
- **Upstream Context**: `Camera Ingestion Context` (`camera-backend`)
  - Acts as the Single Source of Truth for live camera inventory, availability status, geo-location, and live snapshot pixel data.
  - Role: **Open Host Service (OHS)** exposing standard JSON and binary image endpoints.
- **Downstream Context**: `Flood Intelligence Context` (`backend`)
  - Role: **Customer / Consumer** with an **Anticorruption Layer (ACL)** represented by `CameraServiceClient`.
  - Maps external camera feeds into internal `CameraResponse` entities, links cameras to municipal `FloodZone` polygons, and feeds imagery into Gemini AI models.
