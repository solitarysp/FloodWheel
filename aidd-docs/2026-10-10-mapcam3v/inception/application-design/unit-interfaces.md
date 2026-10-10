# FloodWheel — Unit Interfaces

## 1. `Camera` Model Interface
```typescript
export interface Camera {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  camera_angle?: string;
  stream_url: string;
  video_url?: string | null;
  zone_id?: string | null;
  status: "ONLINE" | "OFFLINE" | string;
  failed_polls_count?: number;
  last_polled_at?: string;
  created_at?: string;
}
```

## 2. `CameraMapProps` Interface
```typescript
export interface CameraMapProps {
  cameras: Camera[];
  onAnalyze?: (camera: Camera, frameBase64?: string) => void;
  selectedCameraId?: string | null;
  className?: string;
}
```
