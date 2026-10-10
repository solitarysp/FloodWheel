# FloodWheel — Application Design: Unit Interfaces

## 1. Inference Response Interface (`POST /api/v1/analyze`)
```typescript
export interface AnalysisResponse {
  flood_detected: boolean;
  confidence_score: number;
  depth_level: number | null; // 0 to 5
  depth_estimate_cm_min: number;
  depth_estimate_cm_max: number;
  reference_objects_used: string[];
  reasoning: string; // Strictly English
  alert_message: string; // Strictly English
  processing_time_ms: number;
  model_version: string;
}
```

## 2. Route Safety Scoring Interface (`POST /api/v1/route/safety`)
```typescript
export interface RouteSafetyRequest {
  vehicle_type: "motorcycle" | "car";
  waypoints: Array<{
    lat: number;
    lng: number;
  }>;
}

export interface FloodedSegment {
  waypoint_index: number;
  zone_id: string;
  zone_name: string; // e.g. "Nguyen Huu Canh Corridor"
  district: string;  // e.g. "Binh Thanh"
  depth_level: number;
  depth_cm_range: string; // e.g. "30-38cm"
  distance_meters: number;
}

export interface RouteSafetyResponse {
  vehicle_type: "motorcycle" | "car";
  safety_score: number; // 0 to 100
  is_recommended: boolean;
  worst_flood_level: number;
  max_depth_cm: number;
  detour_advice: string; // Strictly English warning
  impacted_segments_count: number;
  flooded_segments: FloodedSegment[];
}
```

## 3. Zone Telemetry Interface (`GET /api/v1/flood/zone/{zone_id}`)
```typescript
export interface ZoneStatusResponse {
  id: string;
  name: string; // English localized name
  district: string;
  city: string;
  depth_level: number;
  depth_cm_min: number;
  depth_cm_max: number;
  confidence_score: number;
  is_flooded: boolean;
  is_overridden: boolean;
  cameras_reporting: number;
  active_alerts: string[]; // e.g. ["Flood Alert: 30-38cm"]
  last_updated: string;
}
```
