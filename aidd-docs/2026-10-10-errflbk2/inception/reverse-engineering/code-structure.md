# FloodWheel — Code Structure

## Subsystem: `camera-backend/`

```
camera-backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── cameras.py        # Snapshot and catalog endpoints
│   │       │   └── health.py         # Microservice health check
│   │       └── router.py             # FastAPI v1 route assembly
│   ├── core/
│   │   ├── config.py                 # App settings (storage dir, timeouts)
│   │   └── logging.py                # Structured logging configuration
│   ├── models/
│   │   └── camera.py                 # Pydantic schemas (CameraDTO, FilterQuery)
│   ├── providers/
│   │   ├── base.py                   # BaseCameraProvider abstract interface
│   │   └── hcmc.py                   # HCMCCameraProvider (.VDMS session, 8007 scraping)
│   ├── services/
│   │   ├── cache_service.py          # Redis caching service
│   │   ├── catalog_service.py        # Aggregator & query engine
│   │   ├── image_validator.py        # (NEW) Signature & placeholder validator
│   │   └── storage_service.py        # (NEW) Disk snapshot persistence & retrieval
│   └── main.py                       # FastAPI application entrypoint & lifespan
├── storage/
│   └── snapshots/                    # (NEW) Persistent directory for {camera_id}.jpg
├── tests/
│   ├── conftest.py                   # Pytest fixtures & mock providers
│   ├── test_cameras_api.py           # Endpoint integration tests
│   ├── test_image_validator.py       # (NEW) Tests for placeholder detection
│   └── test_storage_service.py       # (NEW) Tests for disk caching & fallback
├── Dockerfile                        # Multi-stage production container build
├── requirements.txt                  # Python dependencies
└── sample_error_snapshot.jpeg        # Real-world municipal error image artifact
```
