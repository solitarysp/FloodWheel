from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.models.flood_reading import AnalysisResponse
from app.services.flood_queue_service import flood_queue_service

router = APIRouter(prefix="/analyze", tags=["Analysis"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("", response_model=List[AnalysisResponse], status_code=status.HTTP_200_OK)
async def analyze_images(
    files: List[UploadFile] = File(..., description="1 to 5 traffic camera images"),
    camera_angle: str = Form("elevated", description="Camera angle: street_level, elevated, or overhead"),
    location_hint: Optional[str] = Form(None, description="Optional street name or city reference"),
):
    """Analyze up to 5 traffic camera frames to measure flood depth using Gemini VLRDR via AI Queue."""
    if not files:
        raise HTTPException(status_code=400, detail="At least one image must be provided.")

    if len(files) > settings.MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Too many images. Maximum allowed per request is {settings.MAX_IMAGES_PER_REQUEST}.",
        )

    results: List[AnalysisResponse] = []
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

    for idx, file in enumerate(files):
        # Validate MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' has unsupported MIME type '{file.content_type}'. Allowed types: JPEG, PNG, WebP.",
            )

        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' exceeds maximum allowed size of {settings.MAX_IMAGE_SIZE_MB}MB.",
            )

        camera_id = f"demo-cam-{idx + 1}"
        file_desc = file.filename or f"Demo Frame #{idx + 1}"

        # Submit task through central AI Queue and await result
        res: AnalysisResponse = await flood_queue_service.submit_task(
            task_type="image_upload",
            source="demo_upload",
            params={
                "image_bytes": content,
                "camera_angle": camera_angle,
                "location_hint": location_hint or file.filename,
                "filename": file.filename,
            },
            camera_id=camera_id,
            camera_name=file_desc,
            priority=1,
            wait_result=True,
            timeout=60.0,
        )

        results.append(res)

    return results
