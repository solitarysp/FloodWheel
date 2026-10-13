# API Documentation — FloodWheel Queue & Admin Operations

## 1. Admin Telemetry Overview
- **Endpoint**: `GET /api/v1/admin/overview`
- **Auth**: Bearer JWT (HS256)
- **Description**: Returns counts of cameras, flood zones, alerts, and detailed queue state.
- **Response Schema**:
```json
{
  "success": true,
  "operator": "admin",
  "cameras": { "total": 800, "online": 780, "offline": 20, "maintenance": 0 },
  "zones": { "total": 24, "overridden": 0 },
  "alerts": { "active_count": 0 },
  "queue": {
    "is_running": true,
    "status": "idle",
    "is_processing": false,
    "is_paused": false,
    "interval_seconds": 1800,
    "interval_minutes": 30.0,
    "current_camera_id": null,
    "current_camera_name": null,
    "queue_length": 0,
    "current_cycle_id": 4,
    "cycle_progress": {
      "cycle_id": 4,
      "total": 15,
      "processed": 15,
      "success": 12,
      "skipped": 2,
      "failed": 1,
      "flooded": 3
    },
    "last_cycle_started_at": "2026-10-13T12:00:00Z",
    "last_cycle_completed_at": "2026-10-13T12:02:15Z",
    "next_run_at": "2026-10-13T12:32:15Z",
    "next_run_in_seconds": 1240,
    "last_cycle_summary": {
      "cycle_id": 4,
      "started_at": "2026-10-13T12:00:00Z",
      "completed_at": "2026-10-13T12:02:15Z",
      "duration_seconds": 135.0,
      "total_cameras": 15,
      "successful": 12,
      "skipped": 2,
      "failed": 1,
      "flooded_count": 3,
      "max_depth_cm": 45
    },
    "recent_results": []
  }
}
```

## 2. Trigger Queue Cycle Immediately
- **Endpoint**: `POST /api/v1/admin/queue/trigger` (also aliased at `POST /api/v1/admin/poll-cycle`)
- **Auth**: Bearer JWT (HS256)
- **Description**: Immediately kicks off an automated analysis cycle, waking the background loop or starting the worker if stopped.
- **Response**:
```json
{
  "success": true,
  "message": "Đã kích hoạt chu kỳ quét phân tích ngập AI ngay lập tức.",
  "result": { "status": "running", "current_cycle_id": 5, ... }
}
```

## 3. Pause & Resume Queue
- **Endpoints**: `POST /api/v1/admin/queue/pause` and `POST /api/v1/admin/queue/resume`
- **Auth**: Bearer JWT (HS256)
- **Description**: Pauses or resumes scheduled cyclical executions.

## 4. Reconfigure Queue Scheduler
- **Endpoint**: `PATCH /api/v1/admin/queue/config`
- **Auth**: Bearer JWT (HS256)
- **Payload**:
```json
{
  "interval_minutes": 30,
  "max_cameras_per_cycle": 20
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Đã cập nhật cấu hình hàng đợi AI.",
  "interval_minutes": 30,
  "max_cameras_per_cycle": 20
}
```
