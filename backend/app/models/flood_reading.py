from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class FloodReading(BaseModel):
    camera_id: str = Field(..., description="Unique camera identifier or 'demo-upload'")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of frame analysis")
    flood_detected: bool = Field(..., description="Whether water/flooding is visually detected")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    depth_level: Optional[int] = Field(None, ge=0, le=5, description="Depth level from 0 to 5, or null if indeterminable")
    depth_estimate_cm_min: int = Field(0, ge=0, description="Minimum estimated flood depth in cm")
    depth_estimate_cm_max: int = Field(0, ge=0, description="Maximum estimated flood depth in cm")
    reference_objects_used: List[str] = Field(default_factory=list, description="Landmarks used, e.g. motorcycle wheel, car door sill")
    reasoning: str = Field(..., max_length=1000, description="Visual explanation of landmark relative reasoning")
    alert_message: str = Field(..., max_length=300, description="Human-readable warning suitable for display or alerts")

    @field_validator("confidence_score")
    @classmethod
    def round_confidence(cls, v: float) -> float:
        return round(v, 2)


class AnalysisResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    success: bool
    reading: FloodReading
    inference_time_ms: float
    model_used: str
    tokens_used: Optional[int] = None
    raw_response: Optional[str] = None
    prompt_preview: Optional[str] = None
    task_id: Optional[str] = None


