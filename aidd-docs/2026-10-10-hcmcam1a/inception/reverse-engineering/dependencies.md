# Stage 2 — Reverse Engineering: Dependencies

## 1. Camera Backend Direct Dependencies (`camera-backend/requirements.txt`)
```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.6
pydantic>=2.9.2
pydantic-settings>=2.5.2
httpx>=0.27.2
redis>=5.0.8
pillow>=10.4.0
pytest>=8.3.3
pytest-asyncio>=0.24.0
```

## 2. Rationale & Security Assessment
- **FastAPI + Uvicorn**: Lightweight and asynchronous; native support for streaming responses (`StreamingResponse` / `Response` with binary data).
- **HTTPX**: Supports native async/await syntax, persistent connection pooling for high-frequency snapshot polling, and granular timeout configurations.
- **Redis**: Low-latency cache (sub-millisecond) preventing redundant scraping traffic against government servers.
- **Pillow**: Zero external binary overhead for validating JPEG integrity and generating synthetic fallback frames if government endpoints experience downtime.
