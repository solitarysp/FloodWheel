# FloodWheel — Architecture Overview: Map Camera Visualization

## 1. System Integration Flow

```mermaid
graph TD
    subgraph Frontend Client Next.js
        Page[CamerasPage /cameras]
        Toggle{View Mode}
        GridView[Grid View: CameraCard list]
        MapView[Interactive Camera Map: Leaflet]
        Clusters[Leaflet.markercluster Engine]
        Drawer[Camera Detail & Snapshot Popup / Flyout]
    end

    subgraph Core Backend FastAPI :8000
        CamRouter[GET /api/v1/cameras]
        SnapProxy[GET /api/v1/cameras/{id}/snapshot]
        AnalyzeEndpoint[POST /api/v1/cameras/{id}/analyze]
    end

    subgraph Camera Backend :8001
        HCMCProvider[HCMCCameraProvider ~800 cams]
        DiskCache[(storage/snapshots/)]
        RedisCache[(Redis Cache)]
    end

    Page --> Toggle
    Toggle -->|Grid Mode| GridView
    Toggle -->|Map Mode| MapView
    MapView --> Clusters
    Clusters --> Drawer
    Drawer -->|Live Image Stream| SnapProxy
    Drawer -->|Gemini VLRDR| AnalyzeEndpoint

    GridView --> CamRouter
    MapView --> CamRouter
    CamRouter --> HCMCProvider
    SnapProxy --> DiskCache
```

## 2. Component Design Principles
- **Dynamic Client-Side Map Loading**: Next.js runs SSR; Leaflet requires browser `window`. The map is dynamically loaded with `next/dynamic` with `{ ssr: false }` to prevent hydration mismatches.
- **Open Tiles, Zero Paywalls**: Uses OpenStreetMap or CartoDB Positron raster tiles. No proprietary API tokens or monthly tier limits required.
- **Marker Cluster Aggregation**: Distributes ~800 coordinates into spatial clusters. Clicking a cluster zooms into the street corridor. Clicking an individual pin opens a rich snapshot card.
- **Synchronized State**: Search queries and district selector inputs filter both the Map pins and the Grid cards synchronously.
