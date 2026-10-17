"""Application configuration module using Pydantic Settings."""

from typing import Any, List, Union
try:
    from pydantic import AnyHttpUrl, field_validator
    from pydantic_settings import BaseSettings
except ImportError:
    try:
        from pydantic import AnyHttpUrl, field_validator, BaseModel as BaseSettings  # type: ignore
    except ImportError:
        AnyHttpUrl = str  # type: ignore
        def field_validator(*args, **kwargs):  # type: ignore
            return lambda fn: fn
        class BaseSettings:  # type: ignore
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)


class Settings(BaseSettings):
    PROJECT_NAME: str = "FloodWheel Camera Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8001

    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/1"
    REDIS_MAX_CONNECTIONS: int = 20

    # HCMC Municipal Traffic Portal Settings
    HCMC_BASE_URL: str = "https://giaothong.hochiminhcity.gov.vn"
    HCMC_MAP_URL: str = "https://giaothong.hochiminhcity.gov.vn/map.aspx"
    HCMC_AJAX_FOLDER_URL: str = (
        "https://giaothong.hochiminhcity.gov.vn/ajaxpro/"
        "VDMS.Web.Library.AJAX.FolderAjax,VDMS.Web.Library.ashx"
    )
    HCMC_CAMERA_HANDLER_URL: str = (
        "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx"
    )
    HCMC_USER_AGENT: str = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )

    # Caching & Synchronization Settings
    SNAPSHOT_CACHE_TTL_SECONDS: float = 10.0
    SESSION_COOKIE_TTL_SECONDS: float = 900.0  # 15 minutes
    CATALOG_SYNC_INTERVAL_SECONDS: int = 21600  # 6 hours
    SNAPSHOT_CRAWL_INTERVAL_SECONDS: int = 600  # 10 minutes periodic crawl
    SNAPSHOT_CRAWL_CONCURRENCY: int = 1  # sequential queue
    SNAPSHOT_CRAWL_DELAY_SECONDS: float = 0.3  # pause between consecutive snapshots
    SNAPSHOT_CRAWL_ENABLED: bool = True
    HTTP_TIMEOUT_SECONDS: float = 12.0
    SNAPSHOT_STORAGE_DIR: str = "storage/snapshots"
    SNAPSHOT_ERROR_RETRY_COUNT: int = 3
    SNAPSHOT_ERROR_RETRY_DELAY_SECONDS: float = 0.0

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://backend:8000",
        "http://frontend:3000",
    ]

    @field_validator("SNAPSHOT_ERROR_RETRY_COUNT", mode="before")
    @classmethod
    def parse_retry_count(cls, v: Any) -> int:
        import os
        val = v if v is not None and v != "" else (
            os.getenv("SNAPSHOT_ERROR_RETRY_COUNT") or os.getenv("SNAPSHOT_RETRY_COUNT") or 3
        )
        try:
            return max(0, int(val))
        except (ValueError, TypeError):
            return 3

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return [str(v)]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()
