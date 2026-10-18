from typing import Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.services.auth_service import auth_service


class AdminUser(BaseModel):
    username: str
    role: str = "admin"
    authenticated_via: str = "bearer"  # "bearer" | "api_key" | "dev"


async def verify_admin_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> str:
    """Verifies X-API-Key header for sensitive admin operations (legacy/script support)."""
    if settings.ENVIRONMENT == "development" and not x_api_key:
        return "dev-operator"

    expected_key = settings.SECRET_KEY
    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header for administrative action.",
        )
    return x_api_key


async def get_current_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> AdminUser:
    """FastAPI dependency verifying Bearer JWT or administrative X-API-Key.

    Returns AdminUser if valid, otherwise raises HTTP 401 Unauthorized.
    """
    # 1. Bearer Token Check
    if authorization:
        parts = authorization.strip().split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = auth_service.verify_access_token(token)
            if payload and payload.get("sub"):
                return AdminUser(
                    username=payload["sub"],
                    role=payload.get("role", "admin"),
                    authenticated_via="bearer",
                )

    # 2. X-API-Key Check (for automated webhooks and CLI scripts)
    if x_api_key and x_api_key == settings.SECRET_KEY:
        return AdminUser(
            username="api-operator",
            role="admin",
            authenticated_via="api_key",
        )

    # 3. Development environment permissive bypass ONLY if explicitly configured
    if settings.ENVIRONMENT == "development" and not authorization and not x_api_key:
        # Allow dev testing if no header is passed in dev mode
        return AdminUser(
            username="dev-admin",
            role="admin",
            authenticated_via="dev",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập quản trị viên không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
        headers={"WWW-Authenticate": "Bearer"},
    )
