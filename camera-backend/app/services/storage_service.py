"""Persistent disk storage service for camera snapshot frames.

Ensures valid snapshots are persisted to disk atomically and served
sub-millisecond when upstream services fail or return error placeholders.
"""

import asyncio
import logging
import os
from pathlib import Path
import re
import time
from typing import Optional, Union

logger = logging.getLogger("camera_service.storage")


class SnapshotStorageService:
    """Manages file storage for historical camera snapshots."""

    def __init__(self, storage_dir: Optional[Union[str, Path]] = None):
        if storage_dir is None:
            try:
                from app.core.config import settings
                storage_dir = settings.SNAPSHOT_STORAGE_DIR
            except Exception:
                storage_dir = "storage/snapshots"
        self.storage_dir = Path(storage_dir)
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            logger.error("Failed to create storage directory %s: %s", self.storage_dir, exc)

    def _sanitize_camera_id(self, camera_id: str) -> str:
        """Strips unsafe path characters to prevent directory traversal."""
        # Allow alphanumeric, hyphens, and underscores only
        sanitized = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(camera_id).strip())
        return sanitized or "unknown_cam"

    def get_snapshot_path(self, camera_id: str) -> Path:
        """Returns the absolute or relative Path for a camera's stored snapshot."""
        safe_id = self._sanitize_camera_id(camera_id)
        return self.storage_dir / f"{safe_id}.jpg"

    def _sync_write(self, target_path: Path, image_bytes: bytes):
        """Synchronous atomic write using a temporary file."""
        tmp_path = target_path.with_name(f"{target_path.stem}_{time.time_ns()}.tmp")
        try:
            with open(tmp_path, "wb") as f:
                f.write(image_bytes)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, target_path)
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass

    def _sync_read(self, target_path: Path) -> Optional[bytes]:
        """Synchronous file read."""
        if not target_path.exists():
            return None
        try:
            with open(target_path, "rb") as f:
                data = f.read()
                return data if len(data) > 0 else None
        except Exception as exc:
            logger.warning("Error reading snapshot from %s: %s", target_path, exc)
            return None

    async def save_snapshot(self, camera_id: str, image_bytes: bytes) -> Optional[Path]:
        """Asynchronously writes a valid image payload to disk storage."""
        if not image_bytes or len(image_bytes) < 100:
            return None

        target_path = self.get_snapshot_path(camera_id)
        try:
            await asyncio.to_thread(self._sync_write, target_path, image_bytes)
            logger.debug("Successfully saved snapshot for %s to %s", camera_id, target_path)
            return target_path
        except Exception as exc:
            logger.error("Failed to save snapshot for %s: %s", camera_id, exc)
            return None

    async def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        """Asynchronously reads the stored snapshot for a camera from disk."""
        target_path = self.get_snapshot_path(camera_id)
        return await asyncio.to_thread(self._sync_read, target_path)

    async def has_snapshot(self, camera_id: str) -> bool:
        """Checks if a snapshot exists on disk for a camera."""
        target_path = self.get_snapshot_path(camera_id)
        return await asyncio.to_thread(target_path.exists)

    async def delete_snapshot(self, camera_id: str) -> bool:
        """Deletes a snapshot file from disk if present."""
        target_path = self.get_snapshot_path(camera_id)

        def _sync_del():
            if target_path.exists():
                target_path.unlink()
                return True
            return False

        try:
            return await asyncio.to_thread(_sync_del)
        except Exception as exc:
            logger.warning("Failed to delete snapshot for %s: %s", camera_id, exc)
            return False
