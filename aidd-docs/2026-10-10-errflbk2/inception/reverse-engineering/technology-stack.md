# FloodWheel — Technology Stack

| Layer | Technologies | Role / Justification |
|---|---|---|
| **Programming Language** | Python 3.11+ | High-performance asynchronous runtime for web and I/O. |
| **API Framework** | FastAPI 0.110+ | Asynchronous ASGI framework for microservice routing. |
| **HTTP Client** | HTTPX 0.27+ | Asynchronous HTTP client with connection pooling and SSL support. |
| **In-Memory Cache** | Redis 7 (via `redis-py` async) | High-speed cache for raw frame bytes and municipal cookies. |
| **Disk Storage** | Local Posix Filesystem / `aiofiles` / `pathlib` | Persistent file storage for last-known-good snapshots. |
| **Image Processing** | Pillow (PIL) 10.3+ | Synthetic frame generation and image validation/header checks. |
| **Configuration** | Pydantic Settings 2.2+ | Type-safe environment variable parsing. |
| **Containerization** | Docker, Docker Compose | Multi-container orchestration (`backend`, `camera-backend`, `frontend`, `postgres`, `redis`). |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX TestClient | Comprehensive test suite for async flows and mocking. |
