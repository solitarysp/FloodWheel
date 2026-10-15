"""Camera snapshot discovery, disk validation, and mock image filtering service.

Scans persistent storage locations, filters out error placeholders and synthetic mock frames,
and provides fast indexed sets of camera IDs that possess authentic snapshot frames.
"""

import logging
from pathlib import Path
import re
import time
from typing import List, Optional, Set, Tuple

logger = logging.getLogger("floodwheel.camera_snapshot_finder")


class CameraSnapshotFinder:
    """Manages disk snapshot lookup and verified snapshot camera indexing."""

    _valid_ids_cache: Optional[Tuple[Set[str], float]] = None
    CACHE_TTL_SECONDS: float = 30.0

    @classmethod
    def get_candidate_directories(cls) -> List[Path]:
        """Returns list of candidate storage directories for camera snapshots."""
        candidate_dirs: List[Path] = []
        try:
            from app.config import settings
            candidate_dirs.append(Path(settings.SNAPSHOT_STORAGE_DIR))
        except Exception:
            pass

        candidate_dirs.extend([
            Path("/app/storage/snapshots"),
            Path("storage/snapshots"),
            Path("camera-backend/storage/snapshots"),
            Path("../camera-backend/storage/snapshots"),
        ])

        # Return only unique existing directory paths
        seen = set()
        existing = []
        for d in candidate_dirs:
            resolved = d.resolve() if d.exists() else d
            if resolved not in seen and d.is_dir():
                seen.add(resolved)
                existing.append(d)
        return existing

    @classmethod
    def get_valid_snapshot_camera_ids(cls, force_refresh: bool = False) -> Set[str]:
        """Discovers and caches all camera IDs that have a verified authentic real snapshot.

        Rejects any missing files, municipal error banners, and synthetic mock frames.
        """
        now = time.time()
        if not force_refresh and cls._valid_ids_cache is not None:
            cached_ids, cached_time = cls._valid_ids_cache
            if now - cached_time < cls.CACHE_TTL_SECONDS:
                return cached_ids

        from app.services.image_validator import ImageValidator

        valid_ids: Set[str] = set()
        seen_stems: Set[str] = set()

        for c_dir in cls.get_candidate_directories():
            try:
                for img_file in c_dir.glob("*.jpg"):
                    cid = img_file.stem
                    if cid in valid_ids or cid in seen_stems:
                        continue
                    seen_stems.add(cid)
                    try:
                        data = img_file.read_bytes()
                        if ImageValidator.is_valid_real_snapshot(data):
                            valid_ids.add(cid)
                    except Exception:
                        pass
            except Exception as exc:
                logger.warning("Error scanning candidate snapshot dir %s: %s", c_dir, exc)

        cls._valid_ids_cache = (valid_ids, now)
        logger.info("Indexed %d cameras with verified real snapshots on disk.", len(valid_ids))
        return valid_ids

    @classmethod
    def has_valid_snapshot(cls, camera_id: str) -> bool:
        """Checks if a camera has a verified authentic real snapshot."""
        if not camera_id:
            return False
        valid_ids = cls.get_valid_snapshot_camera_ids()
        return camera_id in valid_ids

    @classmethod
    def get_stored_disk_snapshot(cls, camera_id: str) -> Optional[bytes]:
        """Reads camera snapshot from local persistent disk storage if present and valid."""
        if not camera_id:
            return None
        safe_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(camera_id).strip())
        from app.services.image_validator import ImageValidator

        for c_dir in cls.get_candidate_directories():
            target = c_dir / f"{safe_id}.jpg"
            if target.is_file():
                try:
                    data = target.read_bytes()
                    if ImageValidator.is_valid_real_snapshot(data):
                        return data
                except Exception as exc:
                    logger.debug("Failed reading candidate snapshot %s: %s", target, exc)
        return None
