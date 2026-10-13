# Functional Specification Document (FSD) — Automated 30-Minute AI Analysis & Admin Monitor

## 1. System Interaction & Lifecycle Sequences

### Sequence 1: Scheduled & Manual Analysis Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Municipal Admin
    participant AdminUI as Admin Portal (admin.tsx)
    participant AdminAPI as Admin Router (:8000)
    participant Queue as FloodAnalysisQueue
    participant CamSvc as Camera Microservice (:8001)
    participant Analysis as FloodAnalysisService
    participant Gemini as GeminiClient (Vision AI)
    participant DB as PostgreSQL + PostGIS

    Note over Queue: Waiting in 30-min idle countdown
    AdminUI->>AdminAPI: GET /api/v1/admin/overview
    AdminAPI->>Queue: get_status()
    Queue-->>AdminUI: return queue status (next_run_in_seconds: 1240)

    alt Manual Trigger Clicked
        Admin->>AdminUI: Click "Quét Ngay Lập Tức"
        AdminUI->>AdminAPI: POST /api/v1/admin/queue/trigger
        AdminAPI->>Queue: trigger_now() (auto-start worker if stopped)
        Queue-->>AdminAPI: status: running
        AdminAPI-->>AdminUI: return {success: true}
    else 30-Minute Timer Expires
        Note over Queue: asyncio.TimeoutError after 1800s
    end

    Note over Queue: Cycle Started: status = 'running'
    Queue->>DB: Query least-polled cameras (ORDER BY last_polled_at ASC NULLS FIRST LIMIT 15)
    DB-->>Queue: return candidate cameras

    loop For each candidate camera
        Queue->>Queue: Set current_camera_id, camera_name
        Queue->>Analysis: analyze_single_camera(camera_id)
        Analysis->>CamSvc: Fetch snapshot JPEG (timeout 3.0s)
        CamSvc-->>Analysis: return JPEG bytes
        alt Is Placeholder / Synthetic Frame
            Analysis-->>Queue: skipped-default-image (0ms wait)
            Queue->>Queue: increment skipped count
        else Valid Real Camera Frame
            Analysis->>Gemini: analyze_image_bytes(frame_bytes)
            Gemini-->>Analysis: return VLRDR depth assessment
            Analysis->>DB: Save FloodReading & update zone level
            Analysis-->>Queue: return success result
            Queue->>Queue: increment success & flooded count
        end
        Queue->>Queue: update cycle_progress (processed / total)
    end

    Note over Queue: Cycle Finished: compute summary & set next_run_at = now + 30m
    Queue->>Queue: status = 'idle', start 30-min timer
```

### Sequence 2: Admin Live Telemetry Polling Loop

```mermaid
sequenceDiagram
    autonumber
    participant UI as Admin Portal (admin.tsx)
    participant API as /api/v1/admin/overview
    participant Queue as FloodAnalysisQueue Singleton

    loop Every 3 seconds (when active) or 15 seconds (when idle)
        UI->>API: GET /api/v1/admin/overview
        API->>Queue: get_status()
        Queue-->>API: {status, cycle_progress, current_camera_id, next_run_in_seconds}
        API-->>UI: Overview JSON
        UI->>UI: Update progress bar, current thumbnail, countdown clock, chips
    end
```

## 2. Admin UI Telemetry Widget Specification

### 2.1 State-Driven Telemetry Header
- **Running State (`status == "running"`)**:
  - Banner color: Indigo / Blue with animated pulse.
  - Heading: "ĐANG TIẾN HÀNH QUÉT PHÂN TÍCH TỰ ĐỘNG (CHU KỲ #X)".
  - Progress bar: Striped blue/indigo with percentage label (`X% - Đã xử lý Y / Z camera`).
  - Active Camera Card: Displays camera thumbnail image (`/api/v1/cameras/{id}/snapshot`), camera name, district, and camera angle.
  - Stat Chips:
    - 🔵 Tổng camera: Z
    - ⏳ Đang xử lý: Y/Z
    - 🌊 Phát hiện ngập: F
    - 🟢 An toàn: S
    - ⚪ Bỏ qua (ảnh lỗi/placeholder): K
    - 🔴 Thất bại: E
- **Idle State (`status == "idle"`)**:
  - Banner color: Emerald / Slate.
  - Heading: "HÀNG ĐỢI SẴN SÀNG — ĐỢT QUÉT TIẾP THEO SAU: MM:SS".
  - Countdown Clock: Large monospace font `28:45` updating every second.
  - Scheduled time badge: `Dự kiến: 20:15:30 (sau 28 phút 45 giây)`.
  - Last Cycle Card: Displays duration in seconds, total cameras polled, flood instances detected, max depth in cm.
- **Paused State (`status == "paused"`)**:
  - Banner color: Amber.
  - Heading: "HÀNG ĐỢI ĐANG TẠM DỪNG".
  - Action button: "Tiếp tục chạy (Resume)".
- **Error State (`status == "error"`)**:
  - Banner color: Rose.
  - Heading: "HÀNG ĐỢI GẶP SỰ CỐ".
  - Display error details and "Khởi động lại ngay (Restart)".

### 2.2 Direct Queue Controls
- **Quét Ngay Lập Tức (Trigger Now)**: Issues `POST /api/v1/admin/queue/trigger`. Fast feedback toast.
- **Tạm Dừng / Tiếp Tục (Pause / Resume)**: Issues `POST /api/v1/admin/queue/pause` or `/resume`.
- **Cấu hình hàng đợi (Queue Configuration Modal / Drawer)**:
  - Input: Khoảng cách chu kỳ quét (mặc định 30 phút, tối thiểu 5, tối đa 120).
  - Input: Số lượng camera tối đa mỗi đợt quét (mặc định 15, tối thiểu 5, tối đa 50).
  - Save button issuing `PATCH /api/v1/admin/queue/config`.
