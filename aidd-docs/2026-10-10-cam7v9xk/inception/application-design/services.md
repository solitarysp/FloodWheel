# Stage 6: Application Design — Services Design

## 1. Backend Service Layer Extensions

### `CameraStreamService` (`backend/app/services/camera_stream_service.py`)
- **Responsibilities**:
  - Fetches camera snapshot bytes asynchronously via `httpx.AsyncClient`.
  - Implements an in-memory TTL cache (5 seconds) per `camera_id` to prevent concurrent redundant external requests.
  - Generates realistic fallback test frames if the external public server is unreachable or offline in local test environments.
  - Validates stream URL format and performs lightweight HEAD/GET handshake during custom camera registration.

#### Methods:
```python
class CameraStreamService:
    @classmethod
    async def get_snapshot_bytes(cls, stream_url: str, camera_id: str) -> tuple[bytes, str]:
        """Fetches raw snapshot frame bytes and mime type with in-memory caching."""

    @classmethod
    async def validate_stream_url(cls, stream_url: str) -> bool:
        """Validates that a public camera URL returns an acceptable image/video stream."""

    @classmethod
    def generate_mock_frame(cls, camera_name: str) -> bytes:
        """Generates a synthetic camera test frame if external stream is offline."""
```

### `CameraRegistry` Extension (`backend/app/services/camera_registry.py`)
- Support updating camera `status` to `ONLINE` or `OFFLINE` based on stream health checks.
- Add support for custom camera creation via standard `POST /cameras` endpoint.

### `AnalyzeRouter` Integration (`backend/app/routers/cameras.py`)
- Implements:
  - `GET /cameras/{camera_id}/snapshot`: Streams binary bytes using `Response(content=frame_bytes, media_type=mime_type)`.
  - `POST /cameras/{camera_id}/analyze`:
    1. Fetches current frame from `CameraStreamService`.
    2. Submits to `GeminiClient.analyze_image_bytes(frame_bytes, camera_angle, location_hint)`.
    3. Parses output with `FloodReadingParser.parse()`.
    4. Persists to `FloodReadingDB` and updates `FloodZone.current_depth_level`.
    5. Returns unified `AnalysisResponse`.
