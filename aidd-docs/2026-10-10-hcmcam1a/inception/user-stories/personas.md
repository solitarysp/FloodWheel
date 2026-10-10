# Stage 4 — User Stories: Personas

## Persona 1: Hai Tran — Daily Urban Commuter (Motorbike & Sedan)
- **Role**: Commuter navigating flood-prone corridors in Ho Chi Minh City (Binh Thanh, District 7, Thu Duc).
- **Goal**: Quickly check real-time camera views and flood depth before heading home during heavy monsoon downpours.
- **Pain Point**: Municipal camera websites frequently crash, freeze, or suffer from broken session cookies during heavy rain events.
- **Value from System**: Instant access to live camera feeds with clear street-level imagery and AI flood depth indicators.

## Persona 2: Linh Vo — Municipal Flood Monitoring Specialist
- **Role**: Operations officer at the Flood Prevention & Drainage Operations Center.
- **Goal**: Monitor critical water-logging choke points across all 24 districts of HCMC simultaneously through a single centralized map and dashboard.
- **Pain Point**: Cameras from different departments and districts are fragmented and difficult to aggregate programmatically.
- **Value from System**: Standardized JSON API streaming all ~800 traffic cameras with normalized WGS84 coordinates and automated health status.

## Persona 3: Nguyen Khoa — FloodWheel AI Platform Engineer
- **Role**: Backend & ML engineer maintaining the Gemini Vision VLRDR depth inference pipeline.
- **Goal**: Ingest high-quality camera snapshot frames on demand with low latency without getting rate-limited or blocked by external servers.
- **Pain Point**: Managing ASP.NET session tokens, AjaxPro stack parsing, and connection retries inside the core AI inference service clutters business logic.
- **Value from System**: Dedicated `camera-backend` microservice serving clean, cached JPEG frames through an async REST interface.
