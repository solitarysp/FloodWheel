# Stage 2: Reverse Engineering — Architecture

## Current System Architecture vs Target Extension

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 14)"]
        Landing["Landing Page (/)"]
        Dashboard["Operator Dashboard (/dashboard)"]
        Demo["Demo Sandbox (/demo)"]
        LiveCameras["[NEW] Live Cameras Page (/cameras)"]
        CameraCard["[NEW] Camera Card & Stream Viewer"]
        SnapshotBtn["[NEW] 'Capture & Analyze' Action"]
    end

    subgraph API ["Backend API (FastAPI)"]
        RouterCam["/api/v1/cameras (CRUD & Health)"]
        ProxyCam["[NEW] /api/v1/cameras/{id}/snapshot (Proxy Frame)"]
        AnalyzeCam["[NEW] /api/v1/cameras/{id}/analyze (Live Snapshot VLRDR)"]
        AnalyzeUpload["/api/v1/analyze (Multipart Upload)"]
        RouterFlood["/api/v1/flood (Heatmap & Zones)"]
    end

    subgraph ExternalFeeds ["Public Camera Sources"]
        HCMC_CCTV["Public HCMC CCTV Feeds (giaothong.hochiminhcity.gov.vn)"]
        CustomFeeds["Custom HTTP/HLS Public Camera URLs"]
    end

    subgraph AI ["AI Engine"]
        GeminiClient["GeminiClient (gemini-3.8-flash)"]
        VLRDRPrompt["VLRDR Prompt Builder"]
        Parser["FloodReadingParser"]
    end

    subgraph Storage ["Persistence"]
        Postgres[(PostgreSQL / PostGIS)]
        Redis[(Redis Cache)]
    end

    LiveCameras --> CameraCard
    CameraCard --> SnapshotBtn
    SnapshotBtn --> AnalyzeCam
    CameraCard --> ProxyCam
    ProxyCam --> ExternalFeeds
    AnalyzeCam --> ExternalFeeds
    AnalyzeCam --> GeminiClient
    GeminiClient --> VLRDRPrompt
    GeminiClient --> Parser
    AnalyzeCam --> Postgres
    RouterFlood --> Postgres
    Dashboard --> RouterFlood
```

### Key Architectural Enhancements
1. **Camera Frame Proxy & Ingestion**:
   - Web browsers encounter CORS limitations and mixed content restrictions when fetching public traffic CCTV streams directly.
   - The backend provides a secure asynchronous stream proxy (`GET /api/v1/cameras/{id}/snapshot`) using `httpx.AsyncClient` that caches frames with HTTP ETag / Cache-Control headers to optimize network bandwidth.
2. **One-Click Snapshot Analysis Endpoint**:
   - `POST /api/v1/cameras/{id}/analyze`: Grabs the latest frame from the camera's registered `stream_url`, invokes `GeminiClient` with the camera's specific `camera_angle` and `location_hint`, persists the `FloodReadingDB` record, updates the parent `FloodZone` depth level, and broadcasts the updated status.
3. **Dedicated Camera Observation Portal (`/cameras`)**:
   - Modern Next.js grid presenting public camera streams with auto-refresh timers, filter by district/zone, camera health indicators, and real-time modal display of AI VLRDR reasoning.
