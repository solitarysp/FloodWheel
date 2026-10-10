from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.camera import CameraCreate, CameraResponse
from app.services.camera_registry import CameraRegistry

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraResponse])
async def list_cameras(
    zone_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all registered traffic cameras, optionally filtered by zone."""
    cameras = await CameraRegistry.get_all(db, zone_id=zone_id)
    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get metadata and current health status for a specific camera."""
    cam = await CameraRegistry.get_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")
    return cam


@router.post("/admin", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new traffic camera into the registry (Admin only)."""
    existing = await CameraRegistry.get_by_id(db, camera_in.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Camera with ID '{camera_in.id}' already exists.")
    return await CameraRegistry.create(db, camera_in)
