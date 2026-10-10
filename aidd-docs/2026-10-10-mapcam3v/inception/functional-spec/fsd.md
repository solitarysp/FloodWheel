# FloodWheel — Functional Specification Document (FSD): Camera Map

## 1. User Interaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as End User
    participant Page as CamerasPage (/cameras)
    participant Map as CameraMap Component
    participant Cluster as MarkerCluster Layer
    participant Popup as CameraMapPopup
    participant API as Backend Snapshot Proxy
    participant AI as Gemini VLRDR Modal

    User->>Page: Navigates to /cameras
    Page->>Page: Fetches cameras list (GET /api/v1/cameras?limit=500)
    User->>Page: Toggles view mode to "Map View"
    Page->>Map: Mounts CameraMap(cameras, onAnalyze)
    Map->>Cluster: Adds ~800 coordinates to cluster group
    Map-->>User: Renders Leaflet tiles and cluster badges

    User->>Cluster: Clicks on cluster badge "+15"
    Cluster->>Map: Smooth zoom into neighborhood
    Map-->>User: Spreads individual camera markers

    User->>Map: Clicks camera pin
    Map->>Popup: Opens popup for camera {id}
    Popup->>API: GET /api/v1/cameras/{id}/snapshot?w=480&h=270
    API-->>Popup: Returns binary JPEG frame
    Popup-->>User: Displays camera image & "Analyze with AI" button

    User->>Popup: Clicks "Analyze with AI"
    Popup->>AI: Triggers onAnalyze(camera, frameBase64)
    AI-->>User: Displays VLRDR flood depth reading
```

## 2. Marker Representation
- **Cluster Badge**:
  - Small (< 10 cams): Emerald badge `w-9 h-9`, ring-emerald-400.
  - Medium (10–50 cams): Blue badge `w-10 h-10`, ring-blue-400.
  - Large (> 50 cams): Purple/Indigo badge `w-12 h-12`, ring-indigo-400.
- **Individual Pin**:
  - Custom SVG camera icon inside circular badge with glowing pulse dot.
  - Emerald dot for `ONLINE`, amber dot for `OFFLINE`.
