"""Database seeding and maintenance module.

Sample datasets (SAMPLE_ZONES and SAMPLE_CAMERAS) have been removed.
This module now cleans up legacy sample records from persistent storage
so only authentic municipal cameras and user-defined zones are active.
"""

import logging
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Camera, FloodReadingDB, FloodZone

logger = logging.getLogger(__name__)

# Empty lists preserved for backwards compatibility
SAMPLE_ZONES = []
SAMPLE_CAMERAS = []

# Legacy sample identifiers to purge from persistent database
LEGACY_SAMPLE_CAMERA_IDS = [
    "cam-nhc-01",
    "cam-nhc-02",
    "cam-vvn-01",
    "cam-qh-01",
    "cam-ll-01",
    "cam-tqk-01",
]

LEGACY_SAMPLE_ZONE_IDS = [
    "zone-nguyen-huu-canh",
    "zone-vo-van-ngan",
    "zone-quoc-huong",
    "zone-le-loi",
]


async def seed_database(session: AsyncSession) -> None:
    """Purges any lingering legacy sample cameras/zones from persistent DB."""
    try:
        # 1. Remove readings associated with legacy sample cameras or zones
        await session.execute(
            delete(FloodReadingDB).where(
                FloodReadingDB.camera_id.in_(LEGACY_SAMPLE_CAMERA_IDS)
                | FloodReadingDB.zone_id.in_(LEGACY_SAMPLE_ZONE_IDS)
            )
        )

        # 2. Delete legacy sample cameras
        deleted_cams = await session.execute(
            delete(Camera).where(Camera.id.in_(LEGACY_SAMPLE_CAMERA_IDS))
        )

        # 3. Delete legacy sample zones
        deleted_zones = await session.execute(
            delete(FloodZone).where(FloodZone.id.in_(LEGACY_SAMPLE_ZONE_IDS))
        )

        await session.commit()
        if deleted_cams.rowcount or deleted_zones.rowcount:
            logger.info(
                "Purged %d legacy sample cameras and %d legacy sample zones from database.",
                deleted_cams.rowcount,
                deleted_zones.rowcount,
            )
        else:
            logger.info("Database initialized (no sample seeds).")
    except Exception as e:
        await session.rollback()
        logger.warning("Error during database maintenance: %s", e)
