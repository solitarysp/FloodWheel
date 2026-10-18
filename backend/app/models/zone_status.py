from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ZoneStatus(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    city: str
    depth_level: int = Field(0, ge=0, le=5)
    depth_cm_min: int = Field(0, ge=0)
    depth_cm_max: int = Field(0, ge=0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    is_flooded: bool
    is_overridden: bool = False
    cameras_reporting: int = 0
    active_alerts: List[str] = Field(default_factory=list)
    last_updated: datetime

    class Config:
        from_attributes = True
