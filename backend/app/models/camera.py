from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class FloodReadingSummary(BaseModel):
    flood_detected: bool = Field(..., description="Whether flooding is detected")
    depth_level: Optional[int] = Field(None, ge=0, le=5, description="Depth level 0 to 5")
    depth_estimate_cm_min: int = Field(0, description="Min depth in cm")
    depth_estimate_cm_max: int = Field(0, description="Max depth in cm")
    confidence_score: float = Field(0.0, description="Confidence score 0.0 to 1.0")
    alert_message: str = Field("", description="Alert or advisory text")
    reasoning: Optional[str] = Field(None, description="Landmark reasoning explanation")
    reference_objects: List[str] = Field(default_factory=list, description="Landmarks identified")
    timestamp: datetime = Field(..., description="Timestamp of analysis")

    class Config:
        from_attributes = True


class CameraBase(BaseModel):
    name: str = Field(..., max_length=128)
    location: str = Field(..., max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    camera_angle: str = Field("elevated", description="street_level, elevated, or overhead")
    stream_url: str = Field(..., max_length=512)
    video_url: Optional[str] = Field(None, max_length=512, description="Legacy video stream URL (deprecated in favor of snapshot feeds)")
    zone_id: Optional[str] = Field(None, max_length=64)


class CameraCreate(CameraBase):
    id: str = Field(..., max_length=64)


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_angle: Optional[str] = None
    stream_url: Optional[str] = None
    video_url: Optional[str] = None
    zone_id: Optional[str] = None
    status: Optional[str] = None


class CameraResponse(CameraBase):
    id: str
    status: str
    failed_polls_count: int
    last_polled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    latest_reading: Optional[FloodReadingSummary] = None

    class Config:
        from_attributes = True
