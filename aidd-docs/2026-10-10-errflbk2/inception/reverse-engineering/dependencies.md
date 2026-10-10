# FloodWheel — Dependencies

## System & Python Dependencies

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | `>=0.110.0` | High-performance asynchronous API framework |
| `uvicorn[standard]` | `>=0.28.0` | ASGI server runtime with uvloop support |
| `pydantic` | `>=2.6.4` | Data validation and schema parsing |
| `pydantic-settings` | `>=2.2.1` | Environment variable and configuration parsing |
| `httpx` | `>=0.27.0` | Async HTTP client for municipal scraping and inter-service calls |
| `redis` | `>=5.0.3` | Async Redis driver for cache layer |
| `pillow` | `>=10.3.0` | Image verification, decoding, and fallback OSD generation |
| `aiofiles` | `>=23.2.1` | Asynchronous file I/O operations for non-blocking disk persistence |
| `pytest` | `>=8.1.1` | Test framework |
| `pytest-asyncio` | `>=0.23.6` | Async testing harness |

## Container Dependencies
- `redis:7-alpine`: Key-value cache and session storage.
- Mounted volume: `./camera-backend:/app` providing persistent disk storage for `./camera-backend/storage/snapshots`.
