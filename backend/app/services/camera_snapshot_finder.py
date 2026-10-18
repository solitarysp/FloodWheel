"""Camera snapshot discovery and validation adapter.

Communicates with camera-backend microservice via HTTP API to retrieve verified snapshot indices.
Direct disk file scanning of camera-backend storage is deprecated and removed.
"""

import logging
from pathlib import Path
from typing import List, Optional, Set

logger = logging.getLogger("floodwheel.camera_snapshot_finder")


class CameraSnapshotFinder:
    """Manages verified snapshot camera indexing via camera-backend API."""

    @classmethod
    def get_candidate_directories(cls) -> List[Path]:
        """Deprecated: candidate directories scanning is removed in favor of camera-backend API."""
        return []

    @classmethod
    async def get_valid_snapshot_camera_ids_async(cls, force_refresh: bool = False) -> Set[str]:
        """Discovers all camera IDs that have a verified authentic snapshot via camera-backend API."""
        from app.services.camera_service_client import camera_service_client
        return await camera_service_client.get_valid_snapshot_ids(force_refresh=force_refresh)

    @classmethod
    def get_valid_snapshot_camera_ids(cls, force_refresh: bool = False) -> Set[str]:
        """Synchronously returns cached camera IDs with valid snapshots.
        
        Prefer get_valid_snapshot_camera_ids_async for fresh API querying.
        """
        from app.services.camera_service_client import camera_service_client
        if camera_service_client._valid_ids_cache is not None:
            return camera_service_client._valid_ids_cache[0]
        return set()

    @classmethod
    def has_valid_snapshot(cls, camera_id: str) -> bool:
        """Checks if a camera has a verified authentic real snapshot in local API cache."""
        if not camera_id:
            return False
        return camera_id in cls.get_valid_snapshot_camera_ids()

    @classmethod
    def get_stored_disk_snapshot(cls, camera_id: str) -> Optional[bytes]:
        """Deprecated: direct disk snapshot reading is removed. Use camera-backend API."""
        return None
