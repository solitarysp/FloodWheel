# FloodWheel — Technology Stack

## 1. Frontend Architecture
- **Framework**: Next.js 14 (Pages Router)
- **UI Library**: React 18.3.1
- **Language**: TypeScript 5.6.2
- **Styling**: Tailwind CSS 3.4.13 with `clsx` and `tailwind-merge`
- **Iconography**: Lucide React 0.447.0
- **Mapping**: Mapbox GL JS / Leaflet vector GeoJSON layers
- **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`)

## 2. Backend Engine
- **Framework**: FastAPI 0.115+
- **ASGI Server**: Uvicorn with async event loops
- **Language**: Python 3.11 / Python 3.12
- **Validation**: Pydantic v2 & Pydantic Settings
- **ORM & Database Client**: SQLAlchemy 2.0 (asyncio) + AsyncPG driver
- **Spatial Engine**: PostGIS 3.4 extensions on PostgreSQL 16
- **Cache & Rate Limiting**: In-memory token bucket + Redis client support

## 3. Artificial Intelligence & Vision Engine
- **Provider**: Google DeepMind / Google Cloud GenAI
- **SDK**: `google-genai` (official Google GenAI Python SDK)
- **Primary Model**: `gemini-3.8-flash`
- **Fallback Models**: `gemini-2.5-flash`, `gemini-1.5-flash`
- **Inference Technique**: Visual Landmark Relative Depth Reasoning (VLRDR) zero-shot spatial reasoning with structured JSON response mode (`response_mime_type="application/json"`).

## 4. Infrastructure & DevOps
- **Containerization**: Docker & Docker Compose
- **Observability**: Prometheus middleware exporting standard metrics on `/metrics`
- **Testing**:
  - Unit & Integration: Pytest & pytest-asyncio
  - Load & Concurrency: Locust (simulating 100 cameras & 10,000 requests)
- **Automation**: GNU Make (`Makefile`)
