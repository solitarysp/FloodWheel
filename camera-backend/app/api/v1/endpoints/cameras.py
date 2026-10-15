"""Camera query and snapshot proxy endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.api.deps import get_catalog_service
from app.models.camera import CameraDTO, CameraFilterQuery, CameraListResponse
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("/crawler/status")
async def get_crawler_status(request: Request):
    """Returns telemetry of the periodic snapshot crawler worker."""
    crawler = getattr(request.app.state, "snapshot_crawler", None)
    if not crawler:
        return {"status": "NOT_INITIALIZED", "enabled": False}
    return crawler.get_telemetry()


@router.post("/crawler/run")
async def trigger_crawler_cycle(request: Request):
    """Triggers an immediate snapshot crawl cycle in background."""
    crawler = getattr(request.app.state, "snapshot_crawler", None)
    if not crawler:
        raise HTTPException(status_code=500, detail="Snapshot crawler is not initialized.")
    import asyncio
    asyncio.create_task(crawler.run_crawl_cycle())
    return {"message": "Snapshot crawl cycle dispatched.", "status": "RUNNING"}


@router.get("", response_model=CameraListResponse)
async def list_cameras(
    city: Optional[str] = Query("hcmc", description="City code (e.g. hcmc)"),
    district: Optional[str] = Query(None, description="District filter (e.g. Quận 1, Bình Thạnh)"),
    keyword: Optional[str] = Query(None, description="Keyword search in street name or code"),
    bbox: Optional[str] = Query(None, description="Bounding box 'min_lat,min_lng,max_lat,max_lng'"),
    status: Optional[str] = Query(None, description="Status filter: UP, DOWN, or ALL"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    offset: int = Query(0, ge=0, description="Offset index"),
    catalog: CatalogService = Depends(get_catalog_service),
):
    """Retrieves paginated cameras matching filter criteria."""
    query = CameraFilterQuery(
        city=city,
        district=district,
        keyword=keyword,
        bbox=bbox,
        status=status,
        limit=limit,
        offset=offset,
    )
    return await catalog.get_cameras(query)


@router.get("/{camera_id}", response_model=CameraDTO)
async def get_camera_by_id(
    camera_id: str,
    catalog: CatalogService = Depends(get_catalog_service),
):
    """Retrieves detailed metadata for a specific camera."""
    cam = await catalog.get_camera_by_id(camera_id)
    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID '{camera_id}' not found.",
        )
    return cam


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(
    camera_id: str,
    w: Optional[int] = Query(None, ge=160, le=1920, description="Optional resize width"),
    h: Optional[int] = Query(None, ge=120, le=1080, description="Optional resize height"),
    force_refresh: bool = Query(False, description="Bypass cache and force upstream refresh"),
    catalog: CatalogService = Depends(get_catalog_service),
):
    """Proxies and streams JPEG snapshot image with automated Redis caching."""
    try:
        frame_bytes, content_type, is_hit, source = await catalog.get_snapshot(
            camera_id=camera_id,
            width=w,
            height=h,
            force_refresh=force_refresh,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve snapshot frame: {str(exc)}",
        )

    return Response(
        content=frame_bytes,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=10",
            "Access-Control-Allow-Origin": "*",
            "X-Cache-Status": "HIT" if is_hit else "MISS",
            "X-Fallback-Source": source,
            "X-Camera-ID": camera_id,
        },
    )
