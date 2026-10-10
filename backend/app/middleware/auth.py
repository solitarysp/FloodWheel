from typing import Optional
from fastapi import Header, HTTPException, Security, status
from app.config import settings


async def verify_admin_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> str:
    """Verifies X-API-Key header for sensitive admin operations."""
    # In development mode, allow empty key or any key matching SECRET_KEY
    if settings.ENVIRONMENT == "development" and not x_api_key:
        return "dev-operator"

    expected_key = settings.SECRET_KEY
    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header for administrative action.",
        )
    return x_api_key
