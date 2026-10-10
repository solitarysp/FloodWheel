# Stage 6 — Application Design: Component Dependency Graph

```mermaid
graph TD
    subgraph MicroserviceInternal ["Camera Backend Microservice (:8001)"]
        Router["Endpoints Router<br/>(cameras.py, providers.py, health.py)"]
        CatalogSvc["CatalogService<br/>(Aggregator & Filter Engine)"]
        CacheSvc["CacheService<br/>(Redis & Fallback Storage)"]
        HCMCProv["HCMCCameraProvider<br/>(Implements BaseCameraProvider)"]
        BaseProv["BaseCameraProvider<br/>(Abstract Interface)"]

        Router --> CatalogSvc
        CatalogSvc --> CacheSvc
        CatalogSvc --> BaseProv
        HCMCProv -.->|Implements| BaseProv
        HCMCProv --> CacheSvc
    end

    subgraph CoreBackendApp ["Core FloodWheel Backend (:8000)"]
        CoreRouter["routers/cameras.py"]
        CoreClient["services/camera_service_client.py"]
        GeminiPipe["services/gemini_client.py"]

        CoreRouter --> CoreClient
        CoreRouter --> GeminiPipe
    end

    CoreClient -->|HTTP REST (:8001)| Router
```

## Dependency Rules:
1. `HCMCCameraProvider` depends only on `BaseCameraProvider`, `CacheService`, and standard Python network libraries (`httpx`, `json`, `re`). It has NO dependency on FloodWheel's PostgreSQL models or Gemini AI.
2. `CatalogService` depends on `BaseCameraProvider` abstractions, ensuring new providers can be injected at runtime without tight coupling.
3. `CameraServiceClient` in `backend` encapsulates all HTTP calls to `:8001`. Core routers must never call `camera-backend` directly without using this client.
