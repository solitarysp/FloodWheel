# FloodWheel — API Documentation

## 1. RESTful API Endpoints Overview
The backend exposes RESTful endpoints under `/api/v1` implemented with FastAPI:

### 1.1 Computer Vision & Inference
- **`POST /api/v1/analyze`**
  - **Description**: Upload a single CCTV frame (`image/jpeg`, `image/png`, or `image/webp`) or camera URL for immediate VLRDR analysis using Gemini 3.8 Flash.
  - **Request**: Multipart form data with `image` (binary file), `camera_angle` (`elevated`, `street_level`, `overhead`), `location_hint` (optional string).
  - **Response Payload**:
    ```json
    {
      "flood_detected": true,
      "confidence_score": 0.94,
      "depth_level": 3,
      "depth_estimate_cm_min": 30,
      "depth_estimate_cm_max": 38,
      "reference_objects_used": [
        "Honda Wave motorcycle rear wheel",
        "exhaust pipe tip",
        "concrete curb"
      ],
      "reasoning": "Water level reaches half of the motorcycle rear wheel (~50cm total diameter) and submerges the exhaust pipe tip. The 15cm sidewalk curb is completely underwater.",
      "alert_message": "Flood depth 30-38cm! Motorcycle exhaust pipes are submerged. Two-wheelers and sedans are strongly advised to avoid this street.",
      "processing_time_ms": 782,
      "model_version": "gemini-3.8-flash"
    }
    ```

### 1.2 Flood Map & Zone Telemetry
- **`GET /api/v1/flood/heatmap`**
  - **Description**: GeoJSON FeatureCollection of all active flood zones for rendering map polygon layers.
  - **Query Parameters**: `city` (default: `hcmc`), `min_level` (optional filter).
- **`GET /api/v1/flood/status`**
  - **Description**: Query flood status for a specific geographic radius or zone identifier.
  - **Query Parameters**: `lat`, `lng`, `radius_km`.
- **`GET /api/v1/flood/zone/{zone_id}`**
  - **Description**: Detailed telemetry, recent CCTV readings, active alerts, and vehicle passability guidance for an individual zone.

### 1.3 Routing & Navigation Safety
- **`POST /api/v1/route/safety`**
  - **Description**: Evaluates a series of waypoints along a commuter/courier route against active flood zones.
  - **Request Body**:
    ```json
    {
      "vehicle_type": "motorcycle",
      "waypoints": [
        {"lat": 10.7925, "lng": 106.7180},
        {"lat": 10.7938, "lng": 106.7196},
        {"lat": 10.7950, "lng": 106.7210}
      ]
    }
    ```
  - **Response Payload**:
    ```json
    {
      "vehicle_type": "motorcycle",
      "safety_score": 30,
      "is_recommended": false,
      "worst_flood_level": 3,
      "max_depth_cm": 38,
      "detour_advice": "WARNING: Route crosses Flood Level 3 (up to 38cm). Motorcycle engines are at high risk of water damage. Detour via higher elevation corridors recommended.",
      "impacted_segments_count": 1,
      "flooded_segments": [
        {
          "waypoint_index": 1,
          "zone_id": "zone-nguyen-huu-canh",
          "zone_name": "Nguyen Huu Canh Corridor (Thu Thiem Bridge - The Manor)",
          "district": "Binh Thanh",
          "depth_level": 3,
          "depth_cm_range": "30-38cm",
          "distance_meters": 45
        }
      ]
    }
    ```

### 1.4 Administration & Operator Overrides
- **`PUT /api/v1/admin/zones/{zone_id}/override`**: Set emergency manual depth level and duration.
- **`DELETE /api/v1/admin/zones/{zone_id}/override`**: Cancel manual override.
- **`POST /api/v1/admin/poll-cycle`**: Force an immediate polling cycle across all online CCTV cameras.

### 1.5 System Observability
- **`GET /api/v1/health`**: Health status and database/Gemini connectivity.
- **`GET /metrics`**: Prometheus metrics endpoint for request rates, latency, and token counters.
