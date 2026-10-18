from datetime import datetime, timezone
import time
from typing import Dict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class MetricsCollector:
    """In-memory Prometheus-compatible metrics registry."""

    def __init__(self):
        self.request_counts: Dict[str, int] = {}
        self.error_counts: Dict[str, int] = {}
        self.total_tokens: int = 0
        self.active_alerts_count: int = 2
        self.start_time = datetime.now(timezone.utc)

    def record_request(self, path: str, status_code: int):
        endpoint = path.split("?")[0]
        key = f"{endpoint}:{status_code}"
        self.request_counts[key] = self.request_counts.get(key, 0) + 1
        if status_code >= 400:
            self.error_counts[key] = self.error_counts.get(key, 0) + 1

    def generate_prometheus_output(self) -> str:
        lines = [
            "# HELP floodwheel_api_requests_total Total HTTP requests handled",
            "# TYPE floodwheel_api_requests_total counter",
        ]
        for key, count in self.request_counts.items():
            endpoint, status = key.split(":")
            lines.append(f'floodwheel_api_requests_total{{endpoint="{endpoint}",status="{status}"}} {count}')

        lines.extend([
            "",
            "# HELP floodwheel_active_alerts Active flood zones at or above threshold Level 3",
            "# TYPE floodwheel_active_alerts gauge",
            f"floodwheel_active_alerts {self.active_alerts_count}",
            "",
            "# HELP floodwheel_gemini_tokens_total Cumulative Gemini Vision token usage",
            "# TYPE floodwheel_gemini_tokens_total counter",
            f"floodwheel_gemini_tokens_total {self.total_tokens}",
        ])
        return "\n".join(lines) + "\n"


metrics_collector = MetricsCollector()


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        metrics_collector.record_request(request.url.path, response.status_code)
        return response
