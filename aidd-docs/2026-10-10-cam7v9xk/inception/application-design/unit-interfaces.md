# Stage 6: Application Design — Unit Interfaces

## 1. REST Endpoints Interface Specification

### `GET /api/v1/cameras/{camera_id}/snapshot`
- **Query Params**:
  - `t`: Optional numeric timestamp for client cache-busting.
- **Output**: Binary image payload.
  - `Content-Type: image/jpeg` (or `image/png`)
  - `Cache-Control: public, max-age=5`

### `POST /api/v1/cameras/{camera_id}/analyze`
- **Output**:
```json
{
  "success": true,
  "camera_id": "string",
  "camera_name": "string",
  "reading": {
    "camera_id": "string",
    "flood_detected": true,
    "confidence_score": 0.92,
    "depth_level": 3,
    "depth_estimate_cm_min": 30,
    "depth_estimate_cm_max": 40,
    "reference_objects_used": ["motorcycle wheel (1/2 submerged)", "sidewalk curb"],
    "reasoning": "Motorcycle wheels are submerged up to the exhaust pipe level...",
    "alert_message": "Flood Alert Level 3 (30-40cm)! Danger of engine stall for 2-wheelers."
  },
  "inference_time_ms": 450.2,
  "model_used": "gemini-3.8-flash"
}
```

---

## 2. Frontend TypeScript Interfaces

```typescript
export interface Camera {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  camera_angle: 'street_level' | 'elevated' | 'overhead';
  stream_url: string;
  zone_id: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  last_ping?: string;
}

export interface CameraAnalysisResponse {
  success: boolean;
  camera_id: string;
  camera_name: string;
  reading: {
    camera_id: string;
    flood_detected: boolean;
    confidence_score: number;
    depth_level: number;
    depth_estimate_cm_min: number;
    depth_estimate_cm_max: number;
    reference_objects_used: string[];
    reasoning: string;
    alert_message: string;
  };
  inference_time_ms: number;
  model_used: string;
}

export interface NewCameraPayload {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  camera_angle: 'street_level' | 'elevated' | 'overhead';
  stream_url: string;
  zone_id: string;
}
```
