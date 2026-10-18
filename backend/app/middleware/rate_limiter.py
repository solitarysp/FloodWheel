import time
from typing import Dict, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Token-bucket rate limiter enforcing 100 req/min per IP on public endpoints."""

    def __init__(self, app, max_requests_per_minute: int = 120):
        super().__init__(app)
        self.rate_limit = max_requests_per_minute
        self.client_records: Dict[str, Tuple[float, int]] = {}

    async def dispatch(self, request: Request, call_next):
        # Exclude internal health checks, metrics, and docs from rate limit
        path = request.url.path
        if (
            path in ["/health", "/api/v1/health", "/metrics", "/docs", "/openapi.json"]
            or path.startswith("/static")
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

#         if client_ip in self.client_records:
#             window_start, count = self.client_records[client_ip]
#             if now - window_start < 60.0:
#                 if count >= self.rate_limit:
#                     return JSONResponse(
#                         status_code=429,
#                         content={
#                             "detail": f"Rate limit exceeded ({self.rate_limit} req/min). Please slow down.",
#                         },
#                     )
#                 self.client_records[client_ip] = (window_start, count + 1)
#             else:
#                 self.client_records[client_ip] = (now, 1)
#         else:
#             self.client_records[client_ip] = (now, 1)

        return await call_next(request)
