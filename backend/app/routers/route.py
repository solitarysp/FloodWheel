from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.route_scorer import RouteScorer

router = APIRouter(prefix="/route", tags=["Routing & Navigation"])


class RouteSafetyRequest(BaseModel):
    waypoints: List[List[float]] = Field(
        ...,
        description="Array of [latitude, longitude] pairs representing planned path",
        example=[[10.7938, 106.7196], [10.7945, 106.7205]],
    )
    vehicle_type: str = Field(
        "motorcycle",
        description="Vehicle type: 'motorcycle' or 'car'",
    )


@router.post("/safety")
async def evaluate_route_safety(
    req: RouteSafetyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Evaluates planned navigation route against live urban flood zones and scores passability."""
    if len(req.waypoints) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 waypoints (start and destination) are required to evaluate route safety.",
        )

    result = await RouteScorer.evaluate_route(
        session=db,
        waypoints=req.waypoints,
        vehicle_type=req.vehicle_type,
    )
    return result
