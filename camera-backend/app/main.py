"""Main FastAPI Application Entrypoint for Camera Backend Microservice."""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.providers.hcmc import HCMCCameraProvider
from app.services.cache_service import CacheService
from app.services.catalog_service import CatalogService

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("camera_service.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager initializing connections and providers."""
    logger.info("Initializing %s v%s on port %d...", settings.PROJECT_NAME, settings.VERSION, settings.PORT)

    # 1. Initialize Cache Service
    cache_service = CacheService(settings.REDIS_URL)
    await cache_service.connect()

    # 2. Initialize Providers & Catalog Engine
    hcmc_provider = HCMCCameraProvider(cache_service=cache_service)
    catalog_service = CatalogService(cache_service=cache_service)
    catalog_service.register_provider(hcmc_provider)

    # 3. Restore cached catalog or trigger background initial sync
    await catalog_service.load_initial_catalog()

    # 4. Start periodic background sync worker
    catalog_service.start_background_sync(settings.CATALOG_SYNC_INTERVAL_SECONDS)

    # 5. Store singletons in app state
    app.state.cache_service = cache_service
    app.state.catalog_service = catalog_service
    app.state.hcmc_provider = hcmc_provider

    logger.info("%s ready to serve traffic!", settings.PROJECT_NAME)
    yield

    # Clean shutdown
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    catalog_service.stop_background_sync()
    await hcmc_provider.close()
    await cache_service.close()
    logger.info("%s cleanly shut down.", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Dedicated microservice for municipal and private traffic CCTV camera ingestion, "
        "real-time snapshot streaming, and catalog synchronization."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service identity."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
        "cameras": "/api/v1/cameras",
    }
