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
    """Initializes tables in database."""
    try:
        async with engine.begin() as conn:
            # Enable PostGIS if on PostgreSQL
            if "postgresql" in settings.DATABASE_URL:
                try:
                    await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                except Exception as ext_err:
                    logger.warning(f"PostGIS extension creation skipped/failed: {ext_err}")
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization warning (DB might be offline during build): {e}")
