from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import AsyncSessionLocal, init_db
from app.db.seed_data import seed_database
from app.middleware.metrics import PrometheusMetricsMiddleware, metrics_collector
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routers import admin, analyze, cameras, flood, health, route

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("floodwheel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FloodWheel AI Backend...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Primary Gemini Model: {settings.GEMINI_MODEL}")

    # Initialize DB & Seed data
    await init_db()
    try:
        async with AsyncSessionLocal() as session:
            await seed_database(session)
    except Exception as e:
        logger.warning(f"Seed database warning: {e}")

    # Start automated flood analysis background queue (runs every 30m after last completion)
    from app.services.flood_queue_service import flood_queue_service
    if getattr(settings, "FLOOD_QUEUE_AUTO_START", True):
        await flood_queue_service.start()

    yield
    logger.info("Shutting down FloodWheel AI Backend...")
    await flood_queue_service.stop()


app = FastAPI(
    title="FloodWheel API",
    description="Real-time urban flood depth mapping from CCTV feeds using Gemini Vision AI (VLRDR methodology)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Prometheus and Rate Limiting middlewares
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(PrometheusMetricsMiddleware)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(health.router, prefix="/api/v1")
app.include_router(health.router)  # also accessible at /health
app.include_router(analyze.router, prefix="/api/v1")
app.include_router(cameras.router, prefix="/api/v1")
app.include_router(flood.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(route.router, prefix="/api/v1")


@app.get("/metrics")
async def get_metrics():
    """Prometheus-compatible metrics scrape endpoint."""
    return Response(
        content=metrics_collector.generate_prometheus_output(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


@app.get("/")
async def root():
    return {
        "project": "FloodWheel",
        "description": "Real-time urban flood depth mapping from traffic cameras using Gemini Vision AI",
        "docs": "/docs",
        "health": "/api/v1/health",
        "metrics": "/metrics",
        "endpoints": {
            "heatmap": "/api/v1/flood/heatmap",
            "zones": "/api/v1/flood/zones",
            "cameras": "/api/v1/cameras",
            "analyze": "/api/v1/analyze",
            "route_safety": "/api/v1/route/safety",
        },
    }
