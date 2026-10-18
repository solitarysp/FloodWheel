"""Camera Pydantic Schemas and Data Transfer Objects."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    def Field(*args, **kwargs):  # type: ignore
        return kwargs.get("default", None)


class CameraDTO(BaseModel):
    """Normalized camera entity representation across all providers."""
    id: str = Field(..., description="Unique camera identifier")
    provider: str = Field(default="hcmc", description="Originating provider (e.g. hcmc)")
    city: str = Field(default="hcmc", description="City code (e.g. hcmc)")
    name: str = Field(..., description="Human-readable camera location/name")
    code: Optional[str] = Field(default=None, description="Official camera reference code")
    district: Optional[str] = Field(default=None, description="Administrative district name")
    latitude: Optional[float] = Field(default=None, description="WGS84 Latitude")
    longitude: Optional[float] = Field(default=None, description="WGS84 Longitude")
    status: str = Field(default="UP", description="Operational status: UP, DOWN, UNKNOWN")
    camera_type: Optional[str] = Field(default="PTZ", description="Camera hardware type")
    snapshot_url: Optional[str] = Field(default=None, description="Proxy snapshot URL endpoint")
    last_synced_at: Optional[datetime] = Field(default=None, description="Timestamp when record was synced")
    raw_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Raw provider metadata")


class CameraListResponse(BaseModel):
    """Paginated list of cameras."""
    total: int
    limit: int
    offset: int
    items: List[CameraDTO]


class CameraFilterQuery(BaseModel):
    """Query filter parameters for searching cameras."""
    city: Optional[str] = "hcmc"
    district: Optional[str] = None
    keyword: Optional[str] = None
    bbox: Optional[str] = Field(
        default=None,
        description="Bounding box in format 'min_lat,min_lng,max_lat,max_lng'",
    )
    status: Optional[str] = Field(
        default=None,
        description="Filter status: 'UP', 'DOWN', or None for all",
    )
    has_snapshot: Optional[bool] = Field(
        default=None,
        description="Filter cameras with verified valid snapshots on disk",
    )
    limit: int = Field(default=50, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class ProviderSyncResult(BaseModel):
    """Synchronization outcome telemetry."""
    provider: str
    status: str
    total_cameras: int
    active_cameras: int
    duration_seconds: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
