from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: str = Field(..., description="Tên đăng nhập quản trị viên")
    password: str = Field(..., description="Mật khẩu quản trị")


class AdminUserResponse(BaseModel):
    username: str
    role: str
    logged_in_at: datetime


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: AdminUserResponse


class OverrideRequest(BaseModel):
    operator_id: Optional[str] = Field("admin", max_length=64)
    override_depth_level: int = Field(..., ge=0, le=5)
    depth_cm_min: int = Field(0, ge=0)
    depth_cm_max: int = Field(0, ge=0)
    reason: str = Field(..., max_length=255)
    duration_hours: int = Field(2, ge=1, le=24)


class OverrideResponse(BaseModel):
    success: bool
    zone_id: str
    override_depth_level: int
    expires_at: datetime
    message: str


class CameraStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="ONLINE | OFFLINE | MAINTENANCE")


class QueueConfigRequest(BaseModel):
    interval_minutes: Optional[int] = Field(None, ge=1, le=120)
    max_cameras_per_cycle: Optional[int] = Field(None, ge=1, le=200)


class CameraBatchAnalyzeRequest(BaseModel):
    camera_ids: List[str] = Field(..., min_length=1, max_length=100, description="Danh sách ID camera cần phân tích")
    force_refresh: bool = Field(True, description="Bắt buộc quét mới, bỏ qua cache AI gần nhất")
