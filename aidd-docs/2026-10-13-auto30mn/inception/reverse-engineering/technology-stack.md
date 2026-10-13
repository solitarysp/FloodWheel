# Technology Stack — FloodWheel

## Runtime & Programming Languages
- **Python**: 3.11+ (FastAPI 0.110+, SQLAlchemy 2.0+ async, Asyncpg, Httpx, Pydantic v2, Pillow)
- **TypeScript**: 5.3+ / JavaScript (Next.js 14.1, React 18.2)
- **Styling**: Tailwind CSS 3.4 with Lucide React icons

## Data Persistence & Messaging
- **Relational / Geospatial DB**: PostgreSQL 16 with PostGIS 3.4
- **Cache & Telemetry Sync**: Redis 7 (via `redis.asyncio` with in-memory fallback)
- **Snapshot Storage**: Local file system volume (`storage/snapshots/`) for last-known-good CCTV frames

## AI & Computer Vision
- **Vision Models**: Google Gemini 2.5 Flash, 2.0 Flash, 3.8 Flash
- **Methodology**: Visual Landmark Relative Depth Ratio (VLRDR) with relative reference objects (motorcycle wheels, curb stones, sidewalk steps)
- **Safety Pacing**: Adaptive lock with rate limit pacing to avoid HTTP 429 quota exhaustion

## Infrastructure & Tooling
- **Containerization**: Docker Compose (`docker-compose.yml`)
- **Web Server / ASGI**: Uvicorn with async event loops
- **Reverse Proxy / Client**: HTTPX with async HTTP/1.1 and connection pooling
