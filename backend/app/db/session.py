import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

# Configured async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an asynchronous DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes tables and extensions in database with robust error isolation."""
    from sqlalchemy import text

    # 1. Enable PostGIS if running on PostgreSQL (non-fatal if already present or unprivileged)
    if "postgresql" in settings.DATABASE_URL:
        try:
            async with engine.begin() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        except Exception as ext_err:
            logger.info(f"PostGIS extension check notice: {ext_err}")

    # 2. Create all ORM tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.warning(f"Database table creation warning: {e}")

    # 3. Apply schema updates (e.g. video_url column on cameras table)
    if "postgresql" in settings.DATABASE_URL:
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE cameras ADD COLUMN IF NOT EXISTS video_url VARCHAR(512);"))
        except Exception as col_err:
            logger.debug(f"video_url column check note: {col_err}")

    # 4. Clean up any stale QUEUED or PROCESSING tasks from previous crashes/restarts
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "UPDATE ai_queue_tasks SET status = 'FAILED', error_message = 'Interrupted by server restart' "
                    "WHERE status IN ('QUEUED', 'PROCESSING');"
                )
            )
    except Exception as reset_err:
        logger.debug(f"ai_queue_tasks recovery note: {reset_err}")

