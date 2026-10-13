# Architecture — FloodWheel

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (Next.js 14 + React 18)"]
        AdminUI["/admin (Admin Operations & Monitoring)"]
        CameraUI["/cameras (CCTV Grid & Map Clustering)"]
        DashboardUI["/ (Public Inundation Heatmap)"]
    end

    subgraph CoreBackend ["Core AI Backend (FastAPI :8000)"]
        AdminRouter["Admin Router (/api/v1/admin)"]
        QueueSvc["FloodAnalysisQueue (30-min Background Scheduler)"]
        AnalysisSvc["FloodAnalysisService"]
        GeminiClient["GeminiClient (VLRDR Vision Inference)"]
        CamRegistry["CameraRegistry & DB Layer"]
    end

    subgraph Microservice ["Camera Microservice (:8001)"]
        CamAPI["Camera Backend Microservice"]
        HCMCSCraper["HCMC Traffic Scraper (map.aspx & port 8007)"]
        DiskStorage["Persistent Disk Storage (storage/snapshots)"]
    end

    subgraph External ["External Services & Data"]
        HCMC["giaothong.hochiminhcity.gov.vn"]
        GeminiAPI["Google Gemini API (Flash 2.5 / 2.0 / 3.8)"]
        Postgres[("PostgreSQL 16 + PostGIS")]
        Redis[("Redis Cache & State Queue")]
    end

    AdminUI -->|Poll Status & Trigger / Pause| AdminRouter
    AdminRouter --> QueueSvc
    QueueSvc -->|Discover least-polled cameras| Postgres
    QueueSvc -->|Discover remote cameras| CamAPI
    QueueSvc --> AnalysisSvc
    AnalysisSvc -->|Fetch snapshot bytes| CamAPI
    CamAPI --> HCMCSCraper
    HCMCSCraper --> HCMC
    AnalysisSvc --> GeminiClient
    GeminiClient --> GeminiAPI
    AnalysisSvc -->|Persist Readings & Zone Aggregations| Postgres
    QueueSvc -->|Sync status JSON| Redis
```

## Subsystem Details
1. **Frontend**: Next.js 14 with TypeScript and Tailwind CSS. Communicates via REST APIs with HS256 JWT Bearer authentication for administrator operations.
2. **Backend**: FastAPI with async SQLAlchemy (asyncpg), Pydantic v2 validation, and async background tasks.
3. **Queue Service (`FloodAnalysisQueue`)**: Singleton background worker running an infinite loop with `asyncio.sleep` / `asyncio.Event` synchronization for scheduled execution.
4. **Camera Microservice (`camera-backend`)**: Independent service managing ~800 HCMC CCTV streams with cookie session maintenance and persistent JPEG storage fallback.
