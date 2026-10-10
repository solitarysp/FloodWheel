"""Abstract Base Class for Camera Providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from app.models.camera import CameraDTO


class BaseCameraProvider(ABC):
    """Abstract interface for municipal and third-party CCTV camera providers."""

    provider_name: str
    city: str

    @abstractmethod
    async def init_session(self) -> Dict[str, str]:
        """Initializes or re-authenticates the provider session, returning session cookies/tokens."""
        pass

    @abstractmethod
    async def get_cameras(self, force_refresh: bool = False) -> List[CameraDTO]:
        """Fetches and normalizes the full camera catalog for this provider."""
        pass

    @abstractmethod
    async def get_snapshot(
        self,
        camera_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> Tuple[bytes, str]:
        """Retrieves raw JPEG image bytes and source indicator ('live', 'disk-storage', 'synthetic')."""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Verifies upstream network connectivity and provider availability."""
        pass
