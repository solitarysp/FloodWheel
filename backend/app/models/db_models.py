from datetime import datetime, timezone
import json
from typing import List, Optional
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    camera_angle = Column(String(32), default="elevated")  # street_level, elevated, overhead
    stream_url = Column(String(512), nullable=False)
    video_url = Column(String(512), nullable=True)  # Legacy video stream URL (deprecated in favor of snapshot feeds)
    zone_id = Column(String(64), ForeignKey("flood_zones.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(32), default="ONLINE")  # ONLINE, OFFLINE, MAINTENANCE
    failed_polls_count = Column(Integer, default=0)
    last_polled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    readings = relationship("FloodReadingDB", back_populates="camera", cascade="all, delete-orphan")


class FloodZone(Base):
    __tablename__ = "flood_zones"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    district = Column(String(64), nullable=False)
    city = Column(String(64), default="hcmc")
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    geometry_geojson = Column(Text, nullable=False)  # GeoJSON polygon geometry string

    current_depth_level = Column(Integer, default=0)
    current_depth_cm_min = Column(Integer, default=0)
    current_depth_cm_max = Column(Integer, default=0)
    is_overridden = Column(Boolean, default=False)
    last_updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FloodReadingDB(Base):
    __tablename__ = "flood_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False, index=True)
    zone_id = Column(String(64), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    flood_detected = Column(Boolean, nullable=False)
    confidence_score = Column(Float, nullable=False)
    depth_level = Column(Integer, nullable=True)
    depth_estimate_cm_min = Column(Integer, default=0)
    depth_estimate_cm_max = Column(Integer, default=0)
    reference_objects = Column(Text, default="[]")  # JSON encoded list of strings
    reasoning = Column(Text, nullable=False)
    alert_message = Column(String(300), nullable=False)

    camera = relationship("Camera", back_populates="readings")

    def get_reference_objects(self) -> List[str]:
        try:
            return json.loads(self.reference_objects or "[]")
        except Exception:
            return []


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String(64), nullable=False, index=True)
    level = Column(Integer, nullable=False)
    message = Column(String(300), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class OperatorOverride(Base):
    __tablename__ = "operator_overrides"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String(64), nullable=False, index=True)
    operator_id = Column(String(64), nullable=False)
    override_depth_level = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AIQueueTaskDB(Base):
    __tablename__ = "ai_queue_tasks"

    id = Column(String(64), primary_key=True, index=True)
    task_type = Column(String(32), nullable=False, index=True)  # cycle_camera, single_camera, batch_camera, image_upload
    source = Column(String(64), nullable=False, index=True)      # automated_scheduler, camera_grid, admin_dashboard, demo_upload, api
    status = Column(String(32), nullable=False, default="QUEUED", index=True)  # QUEUED, PROCESSING, COMPLETED, FAILED, SKIPPED

    camera_id = Column(String(64), nullable=True, index=True)
    camera_name = Column(String(128), nullable=True)
    location_hint = Column(String(255), nullable=True)
    camera_angle = Column(String(32), default="elevated")
    cycle_id = Column(Integer, nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    duration_ms = Column(Float, nullable=True)
    queue_wait_ms = Column(Float, nullable=True)
    inference_time_ms = Column(Float, nullable=True)

    model_used = Column(String(64), nullable=True)
    tokens_used = Column(Integer, nullable=True)

    flood_detected = Column(Boolean, nullable=True)
    depth_level = Column(Integer, nullable=True)
    depth_estimate_cm_min = Column(Integer, default=0)
    depth_estimate_cm_max = Column(Integer, default=0)
    confidence_score = Column(Float, nullable=True)

    reference_objects = Column(Text, default="[]")
    reasoning = Column(Text, nullable=True)
    alert_message = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    prompt_preview = Column(Text, nullable=True)
    raw_response = Column(Text, nullable=True)
    snapshot_url = Column(String(512), nullable=True)

    def get_reference_objects(self) -> List[str]:
        try:
            return json.loads(self.reference_objects or "[]")
        except Exception:
            return []

