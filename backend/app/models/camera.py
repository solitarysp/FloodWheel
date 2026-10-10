from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CameraBase(BaseModel):
    name: str = Field(..., max_length=128)
    location: str = Field(..., max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    camera_angle: str = Field("elevated", description="street_level, elevated, or overhead")
    stream_url: str = Field(..., max_length=512)
    video_url: Optional[str] = Field(None, max_length=512, description="Optional HLS .m3u8 live video stream URL")
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

    class Config:
        from_attributes = True
