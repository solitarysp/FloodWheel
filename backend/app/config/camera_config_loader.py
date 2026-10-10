import json
from pathlib import Path
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.camera import CameraCreate
from app.services.camera_registry import CameraRegistry


class CameraConfigLoader:
    """Loads camera definitions from JSON config files and registers them."""

    @staticmethod
    async def load_from_json(file_path: Path, session: AsyncSession) -> List[str]:
        if not file_path.exists():
            return []

        with open(file_path, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        created_ids = []
        for item in data:
            cam_in = CameraCreate(**item)
            existing = await CameraRegistry.get_by_id(session, cam_in.id)
            if not existing:
                await CameraRegistry.create(session, cam_in)
                created_ids.append(cam_in.id)

        return created_ids
