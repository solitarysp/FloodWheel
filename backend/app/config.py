import json
from typing import Any, List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Admin & Authentication
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_JWT_SECRET: str = "floodwheel-admin-jwt-secret-key-change-in-prod"
    ADMIN_TOKEN_EXPIRE_HOURS: int = 24

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""  # Optional comma-separated list of keys for multi-key rotation
    GEMINI_BASE_URL: Optional[str] = None  # Optional custom API endpoint (e.g., https://my-custom-proxy.com)
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_MIN_CALL_INTERVAL_SECONDS: float = 6.0  # Safe pacing (6.0s = max 10 RPM, well under 15 RPM)

    # Storage & DB
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/floodwheel"
    REDIS_URL: str = "redis://redis:6379/0"

    # Background Automated AI Analysis Queue
    FLOOD_QUEUE_INTERVAL_MINUTES: int = 30
    FLOOD_QUEUE_AUTO_START: bool = False  # Disabled by default, only runs if explicitly set to True
    FLOOD_QUEUE_MAX_CAMERAS_PER_CYCLE: int = 15  # Limit cameras per cycle to stay well within daily quota

    # Smart Analysis Cache TTL (minutes)
    FLOOD_ANALYSIS_CACHE_MINUTES: int = 5  # Reuse recent AI analysis within 5 minutes unless forced

    # Microservices
    CAMERA_BACKEND_URL: str = "http://camera-backend:8001"
    SNAPSHOT_STORAGE_DIR: str = "storage/snapshots"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Image upload limits
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_IMAGES_PER_REQUEST: int = 5

    # AI Analysis Concurrency (number of simultaneous AI analyses)
    AI_ANALYSIS_CONCURRENCY: int = 1

    @field_validator("AI_ANALYSIS_CONCURRENCY", mode="before")
    @classmethod
    def parse_ai_concurrency(cls, v: Any) -> int:
        import os
        val = v if v is not None and v != "" else (
            os.getenv("AI_CONCURRENCY") or os.getenv("FLOOD_AI_CONCURRENCY") or 1
        )
        try:
            return max(1, int(val))
        except (ValueError, TypeError):
            return 1

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
