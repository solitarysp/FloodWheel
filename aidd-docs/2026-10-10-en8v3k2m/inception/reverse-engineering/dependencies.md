# FloodWheel — Dependencies Matrix

## 1. Backend Dependencies (`backend/requirements.txt`)
| Package | Version | Purpose |
|---|---|---|
| `fastapi` | `0.115.0` | High-performance asynchronous web framework |
| `uvicorn[standard]` | `0.30.6` | ASGI server implementation |
| `pydantic` | `2.9.2` | Data validation and settings management |
| `pydantic-settings` | `2.5.2` | Environment configuration loading |
| `python-multipart` | `0.0.12` | Multipart form-data handling for file uploads |
| `google-genai` | `1.0.0` | Official Google GenAI SDK for Gemini 3.8 Flash |
| `httpx` | `0.27.2` | Async HTTP client for CCTV pulling and webhooks |
| `asyncpg` | `0.29.0` | High-performance PostgreSQL async driver |
| `sqlalchemy[asyncio]` | `2.0.35` | Object Relational Mapper with async support |
| `redis` | `5.0.8` | Redis client for caching and rate limiting |
| `pillow` | `10.4.0` | Image processing and privacy filter (face/plate blurring) |
| `pytest` | `8.3.3` | Test runner and assertions |
| `pytest-asyncio` | `0.24.0` | Async test fixtures and execution |
| `alembic` | `1.13.3` | Database migration management |

## 2. Frontend Dependencies (`frontend/package.json`)
| Package | Version | Purpose |
|---|---|---|
| `next` | `14.2.14` | React application framework with SSR/SSG |
| `react` | `^18.3.1` | Core UI component engine |
| `react-dom` | `^18.3.1` | DOM renderer for React |
| `lucide-react` | `^0.447.0` | Modern SVG icons |
| `clsx` | `^2.1.1` | Utility for constructing `className` strings |
| `tailwind-merge` | `^2.5.2` | Tailwind class deduplication and merging |
| `tailwindcss` | `^3.4.13` | Utility-first CSS framework |
| `typescript` | `^5.6.2` | Static typing and interfaces |
