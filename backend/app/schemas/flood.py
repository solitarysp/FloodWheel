from typing import List, Optional
from pydantic import BaseModel, Field


class BatchAnalyzeRequest(BaseModel):
    camera_ids: Optional[List[str]] = Field(None, description="Specific camera IDs to analyze")
    district: Optional[str] = Field(None, description="District filter (e.g. 'Quận 1')")
    limit: int = Field(10, ge=1, le=50, description="Max cameras to analyze in this batch")


class EnqueueRequest(BaseModel):
    camera_ids: List[str] = Field(..., min_length=1, description="List of camera IDs to enqueue")
