# Stage 2: Reverse Engineering — Code Quality Assessment

## Architecture Health & Refactoring Strategy

### Strengths Identified
1. **Clean Separation of Concerns**: Camera models (`CameraBase`, `CameraResponse`), services (`CameraRegistry`), and endpoints (`cameras.py`) are strictly decoupled.
2. **Robust Gemini Multimodal Pipeline**: `GeminiClient` supports raw image byte ingestion directly via `analyze_image_bytes(image_bytes, camera_angle, location_hint)`. The camera snapshot can directly feed into this without temporary disk writes.
3. **Seed Data Ground Truth**: Pre-populated with authentic Ho Chi Minh City traffic cameras (`giaothong.hochiminhcity.gov.vn`) across high-risk flood zones.

### Enhancement Risks & Mitigations
- **Risk 1: Flaky External Camera Streams**: Public CCTV streams might occasionally time out or return non-200 responses.
  - *Mitigation*: Implement a 5-second connection timeout, fallback placeholder visual, and clear camera status indicators (`OFFLINE` / `STREAM_TIMEOUT`).
- **Risk 2: AI Rate Limits**: Rapid clicking of "Capture & Analyze" could trigger API rate limits.
  - *Mitigation*: Debounce the button with a 3-second cooldown and display a loading state during inference.
- **Risk 3: Browser CORS on External Images**: Direct browser `img` tags to external government URLs may fail due to CORS or referer validation.
  - *Mitigation*: Use backend proxy endpoint `/api/v1/cameras/{id}/snapshot` which supplies proper CORS headers and caches frames for 5 seconds.
