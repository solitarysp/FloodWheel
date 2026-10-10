# FloodWheel — API Documentation for Map Layer

## 1. `GET /api/v1/cameras`
- **Query Params**:
  - `limit`: Number of cameras (e.g. 500–1000 for map view to render all pins).
  - `city`: "hcmc".
  - `district`: Optional district filter string.
  - `status`: Optional status filter ("UP", "DOWN", "ALL").
  - `bbox`: Optional bounding box `"min_lat,min_lng,max_lat,max_lng"`.
- **Response Format**:
  ```json
  [
    {
      "id": "56de42f611f398ec0c481287",
      "name": "Ngã tư Hàng Xanh - Xô Viết Nghệ Tĩnh",
      "location": "Bình Thạnh",
      "latitude": 10.80164,
      "longitude": 106.71182,
      "camera_angle": "elevated",
      "stream_url": "/api/v1/cameras/56de42f611f398ec0c481287/snapshot",
      "status": "ONLINE"
    }
  ]
  ```

## 2. `GET /api/v1/cameras/{camera_id}/snapshot`
- **Query Params**:
  - `w`: 480 or 640
  - `h`: 270 or 360
  - `t`: Cache-busting timestamp (e.g. Date.now())
- **Response**: Binary JPEG (`image/jpeg`) served with `Cache-Control: public, max-age=10`.
- **Latency**: < 10ms for cached/persisted frames.

## 3. `POST /api/v1/cameras/{camera_id}/analyze`
- **Body**: `{ "image_base64": null }` (triggers backend to grab fresh snapshot and analyze via Gemini Vision VLRDR).
- **Response**: `AnalysisResponse` JSON with flood depth, confidence score, and landmark reasoning.
