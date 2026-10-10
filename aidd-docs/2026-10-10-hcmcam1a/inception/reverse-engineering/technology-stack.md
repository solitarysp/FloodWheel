# Stage 2 — Reverse Engineering: Technology Stack

## 1. Camera Backend Stack (`camera-backend`)
- **Runtime**: Python 3.12 (slim-bookworm base image)
- **Web Framework**: FastAPI 0.115+
- **ASGI Server**: Uvicorn standard (high-concurrency async event loop)
- **HTTP Client**: HTTPX 0.27+ (async HTTP client with connection pooling, custom headers, and cookie jars)
- **Validation & Schemas**: Pydantic v2 & Pydantic Settings
- **Caching Layer**: Redis 7.0+ (`redis-py` async) with in-memory fallback
- **Image Processing**: Pillow 10.4+ (snapshot validation, mock fallback generation, format conversion)
- **Testing**: Pytest, Pytest-asyncio, HTTPX TestClient

## 2. Infrastructure & Orchestration Stack
- **Containerization**: Docker & Docker Compose
- **Network**: `floodwheel-network` (bridge network shared across containers)
- **Core Database**: PostgreSQL 16 with PostGIS 3.4
- **Shared Cache**: Redis 7 Alpine
- **Frontend Stack**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, Mapbox GL
