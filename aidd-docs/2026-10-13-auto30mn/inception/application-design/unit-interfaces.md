# Unit Interfaces — Automated 30-Minute AI Analysis & Admin Monitor

## 1. REST API Contracts

### `GET /api/v1/admin/overview`
- **Output**:
```typescript
interface AdminOverviewResponse {
  success: boolean;
  operator: string;
  cameras: { total: number; online: number; offline: number; maintenance: number };
  zones: { total: number; overridden: number };
  alerts: { active_count: number };
  queue: {
    is_running: boolean;
    status: "idle" | "running" | "paused" | "error";
    is_processing: boolean;
    is_paused: boolean;
    interval_seconds: number;
    interval_minutes: number;
    current_camera_id: string | null;
    current_camera_name: string | null;
    queue_length: number;
    current_cycle_id: number;
    cycle_progress: {
      cycle_id: number;
      total: number;
      processed: number;
      success: number;
      skipped: number;
      failed: number;
      flooded: number;
    };
    last_cycle_started_at: string | null;
    last_cycle_completed_at: string | null;
    next_run_at: string | null;
    next_run_in_seconds: number;
    last_cycle_summary: {
      cycle_id: number;
      started_at: string;
      completed_at: string;
      duration_seconds: number;
      total_cameras: number;
      successful: number;
      skipped: number;
      failed: number;
      flooded_count: number;
      max_depth_cm: number;
    };
    recent_results: Array<{
      camera_id: string;
      camera_name: string;
      success: boolean;
      skipped?: boolean;
      cached?: boolean;
      flood_detected?: boolean;
      depth_level?: number;
      depth_cm_min?: number;
      depth_cm_max?: number;
      alert_message?: string;
      timestamp: string;
    }>;
  };
}
```

### `POST /api/v1/admin/queue/trigger`
- **Output**:
```json
{
  "success": true,
  "message": "Đã kích hoạt chu kỳ quét phân tích ngập AI ngay lập tức.",
  "result": { ...queue_state... }
}
```

### `PATCH /api/v1/admin/queue/config`
- **Input**:
```json
{
  "interval_minutes": 30,
  "max_cameras_per_cycle": 15
}
```
- **Output**:
```json
{
  "success": true,
  "message": "Đã cập nhật cấu hình hàng đợi AI.",
  "interval_minutes": 30,
  "max_cameras_per_cycle": 15
}
```
