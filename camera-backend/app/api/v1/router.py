"""Aggregate API v1 Router."""

from fastapi import APIRouter
from app.api.v1.endpoints import cameras, health, providers

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(cameras.router)
api_router.include_router(providers.router)
