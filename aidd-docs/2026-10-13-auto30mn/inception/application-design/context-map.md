# Context Map — Automated 30-Minute AI Analysis & Admin Monitor

```mermaid
graph TD
    subgraph UIContext ["Admin Portal Bounded Context"]
        AdminDashboard["Admin Dashboard (admin.tsx)"]
        QueueTelemetry["Queue Live Monitor & Controls"]
    end

    subgraph CoreContext ["Core Inundation & AI Analysis Bounded Context"]
        AdminRouter["Admin Router (:8000)"]
        QueueWorker["FloodAnalysisQueue Scheduler"]
        AnalysisSvc["FloodAnalysisService"]
        GeminiClient["GeminiClient"]
        DBModels[("PostgreSQL + PostGIS")]
    end

    subgraph CameraIngestionContext ["Camera Microservice Context"]
        CameraBackend["Camera Backend (:8001)"]
        HCMCScraper["HCMC Municipal Traffic Portal"]
    end

    QueueTelemetry -->|HTTP REST /overview, /trigger| AdminRouter
    AdminRouter --> QueueWorker
    QueueWorker -->|Least-Recently-Polled Discovery| DBModels
    QueueWorker --> AnalysisSvc
    AnalysisSvc -->|Snapshot Fetch (3s timeout)| CameraBackend
    CameraBackend --> HCMCScraper
    AnalysisSvc --> GeminiClient
    AnalysisSvc -->|Write Readings & Zones| DBModels
```
