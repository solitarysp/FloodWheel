# Stage 2: Reverse Engineering — API Documentation

## Camera Management & Snapshot Analysis API Specification

### 1. `GET /api/v1/cameras`
- **Description**: Returns all registered public CCTV traffic cameras, optionally filtered by `zone_id`.
- **Response**: `200 OK`
```json
[
  {
    "id": "cam-nhc-01",
    "name": "CCTV 042: Nguyen Huu Canh Flyover",
    "location": "Nguyen Huu Canh, Ward 22, Binh Thanh",
    "latitude": 10.7935,
    "longitude": 106.7192,
    "camera_angle": "elevated",
    "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-042.jpg",
    "zone_id": "zone-nguyen-huu-canh",
    "status": "ONLINE"
  }
]
```

### 2. `GET /api/v1/cameras/{camera_id}/snapshot`
- **Description**: Proxies the latest image frame from the camera's `stream_url`. Resolves browser CORS and mixed content limitations.
- **Parameters**:
  - `t` (query, optional): Cache-busting timestamp.
- **Response**: `200 OK` (MIME: `image/jpeg` or `image/png`), binary bytes.
- **Headers**:
  - `Content-Type: image/jpeg`
  - `Cache-Control: public, max-age=5`

### 3. `POST /api/v1/cameras/{camera_id}/analyze`
- **Description**: Grabs the active camera frame, submits to Gemini Vision VLRDR, persists reading, updates zone flood state, and returns analytical depth breakdown.
- **Response**: `200 OK`
```json
{
  "success": true,
  "camera_id": "cam-nhc-01",
  "camera_name": "CCTV 042: Nguyen Huu Canh Flyover",
  "reading": {
    "camera_id": "cam-nhc-01",
    "flood_detected": true,
    "confidence_score": 0.88,
    "depth_level": 3,
    "depth_estimate_cm_min": 30,
    "depth_estimate_cm_max": 40,
    "reference_objects_used": [
      "Motorcycle wheel submerged 1/2 (~35cm)",
      "Sidewalk curb submerged"
    ],
    "reasoning": "Observed motorcycle wheels half submerged in brown turbid water along curb line...",
    "alert_message": "Flood Alert Level 3 (30-40cm)! High water depth on road surface. Proceed with extreme caution.",
    "passability": {
      "motorcycle": false,
      "sedan": false,
      "suv": true,
      "truck": true
    }
  },
  "inference_time_ms": 482.5,
  "model_used": "gemini-3.8-flash"
}
```

### 4. `POST /api/v1/cameras`
- **Description**: Register a new public traffic camera feed.
- **Request Body**:
```json
{
  "id": "cam-custom-01",
  "name": "Ben Thanh Market Traffic Cam",
  "location": "Le Loi & Quach Thi Trang, District 1",
  "latitude": 10.7720,
  "longitude": 106.6980,
  "camera_angle": "elevated",
  "stream_url": "https://giaothong.hochiminhcity.gov.vn/render/cctv/cam-012.jpg",
  "zone_id": "zone-le-loi"
}
```
- **Response**: `201 Created`
