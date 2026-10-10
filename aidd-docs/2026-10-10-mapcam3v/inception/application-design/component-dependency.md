# FloodWheel — Component Dependency Map

| Component | Depends On | Depended On By |
|---|---|---|
| `CameraMap` | `leaflet`, `leaflet.markercluster`, `lucide-react`, `/api/v1/cameras/{id}/snapshot` | `CamerasPage` |
| `CamerasPage` | `CameraMap`, `CameraCard`, `CameraAnalysisModal`, `/api/v1/cameras` | Direct Browser URL Route |
| `CameraAnalysisModal` | `GeminiClient`, `/api/v1/cameras/{id}/analyze` | `CamerasPage`, `CameraMap` |
