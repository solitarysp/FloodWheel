from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.models.flood_reading import AnalysisResponse
from app.services.flood_reading_parser import FloodReadingParser
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/analyze", tags=["Analysis"])
gemini_client = GeminiClient()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("", response_model=List[AnalysisResponse], status_code=status.HTTP_200_OK)
async def analyze_images(
    files: List[UploadFile] = File(..., description="1 to 5 traffic camera images"),
    camera_angle: str = Form("elevated", description="Camera angle: street_level, elevated, or overhead"),
    location_hint: Optional[str] = Form(None, description="Optional street name or city reference"),
):
    """Analyze up to 5 traffic camera frames to measure flood depth using Gemini VLRDR."""
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
        raw_text, model_used, elapsed, tokens = await gemini_client.analyze_image_bytes(
            image_bytes=content,
            camera_angle=camera_angle,
            location_hint=location_hint or file.filename,
        )

        reading = FloodReadingParser.parse(
            raw_text=raw_text,
            camera_id=camera_id,
        )

        results.append(
            AnalysisResponse(
                success=True,
                reading=reading,
                inference_time_ms=round(elapsed * 1000, 1),
                model_used=model_used,
                tokens_used=tokens,
            )
        )

    return results
