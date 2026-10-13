---
name: split-large-files
description: >-
  Chia nhỏ và refactor các file code có kích thước lớn (> 250 dòng) trong repo FloodWheel thành các
  file/module nhỏ gọn, độc lập, mỗi file tối đa 250 dòng code. Hướng dẫn chiến lược phân tách chuyên biệt
  cho Next.js / React (TypeScript) ở frontend và FastAPI / Python ở backend & camera-backend, giữ nguyên
  toàn vẹn logic và API endpoints.
---

# FloodWheel Split Large Files Skill

Skill chuyên biệt dành cho codebase **FloodWheel** nhằm kiểm soát kích thước mã nguồn, chuẩn hóa kiến trúc và tái cấu trúc các file lớn: **mỗi file không vượt quá 250 dòng code**.

---

## 1. Tổng Quan Kiến Trúc Codebase FloodWheel

| Khu vực | Công nghệ | Các file lớn điển hình (> 250 dòng) |
|---|---|---|
| **`frontend/`** | Next.js (Pages router), React, TypeScript, TailwindCSS | `pages/admin.tsx` (2412 dòng), `components/CameraMap.tsx` (636 dòng), `pages/cameras.tsx` (449 dòng), `components/DemoUpload.tsx` (403 dòng), `components/AiQueueBanner.tsx` (291 dòng), `components/AddCameraModal.tsx` (276 dòng) |
| **`backend/`** | FastAPI, Python 3.11+, Pydantic | `app/services/flood_queue_service.py` (934 dòng), `app/routers/admin.py` (762 dòng), `app/services/flood_analysis_service.py` (380 dòng), `app/routers/flood.py` (356 dòng), `app/services/gemini_client.py` (345 dòng) |
| **`camera-backend/`** | FastAPI, Python 3.11+, httpx | `app/providers/hcmc.py` (441 dòng), `app/services/catalog_service.py` (282 dòng) |

---

## 2. Tiêu Chuẩn & Quy Tắc Bắt Buộc

1. **Giới hạn số dòng:** **Tối đa 250 dòng/file** (khuyến nghị 100 - 200 dòng).
2. **Không làm gãy (Zero Breaking Changes):**
   - Giữ nguyên toàn bộ Route / URL / Query params trong Next.js (`frontend/pages/*`).
   - Giữ nguyên toàn bộ REST API endpoints, Request/Response schemas, HTTP status codes trong FastAPI (`backend/app/routers/*`).
   - Đảm bảo logic xử lý dữ liệu và AI prompts giữ nguyên chính xác.
3. **Thứ tự phân tách (Dependency-safe):**
   - Tách leaf modules (Types / Models / Enums / Constants / Schemas) trước.
   - Tách helper / utils / formatters.
   - Tách state hooks / service layer.
   - Tách sub-components / sub-routers.
   - Cập nhật file chính (Entry point).

---

## 3. Chiến Lược Refactor Cho Frontend (Next.js / TypeScript)

### Trường Hợp: Pages Quá Dài (Ví dụ: `frontend/pages/admin.tsx` ~ 2400 dòng)
Không nhồi nhét toàn bộ logic quản trị vào 1 file page. Phân tách theo cấu trúc:
```text
frontend/
├── components/admin/
│   ├── types.ts                     # Interfaces, DTOs, State types (< 150 dòng)
│   ├── hooks/
│   │   ├── useAdminCameras.ts       # Query / Mutation hooks (< 200 dòng)
│   │   ├── useAdminQueue.ts         # Quản lý AI queue state (< 200 dòng)
│   │   └── useAdminLogs.ts          # Quản lý log stream (< 150 dòng)
│   ├── tabs/
│   │   ├── CameraManagementTab.tsx  # Giao diện tab camera (< 250 dòng)
│   │   ├── QueueMonitoringTab.tsx   # Giao diện tab queue (< 250 dòng)
│   │   └── SystemConfigTab.tsx      # Giao diện cấu hình hệ thống (< 200 dòng)
│   └── modals/
│       └── BulkActionDialog.tsx     # Sub-modal riêng (< 200 dòng)
└── pages/
    └── admin.tsx                    # Assemble layout, tab switcher, auth guard (< 150 dòng)
```

### Trường Hợp: Complex Component (Ví dụ: `frontend/components/CameraMap.tsx` ~ 636 dòng)
- Tách Leaflet / Map rendering helpers ra `components/map/mapUtils.ts` hoặc custom hooks `useLeafletMap.ts`.
- Tách Marker popups, Layers control, Cluster logic thành sub-components trong `components/map/`.

---

## 4. Chiến Lược Refactor Cho Backend (FastAPI / Python)

### Trường Hợp: Router Quá Dài (Ví dụ: `backend/app/routers/admin.py` ~ 762 dòng)
Chia nhỏ router thành các sub-routers:
```text
backend/app/routers/admin/
├── __init__.py                      # Gộp APIRouter: router.include_router(...) (< 50 dòng)
├── cameras.py                       # Endpoints CRUD camera của admin (< 250 dòng)
├── queue.py                         # Endpoints điều khiển queue, retry, purge (< 200 dòng)
├── analytics.py                     # Endpoints thống kê, metrics (< 200 dòng)
└── system.py                        # System settings & health status (< 150 dòng)
```
Sau đó trong `backend/app/main.py` chỉ cần include `admin.router` như cũ, không đổi URL prefix.

### Trường Hợp: Service Quá Dài (Ví dụ: `flood_queue_service.py` ~ 934 dòng)
Tách service theo trách nhiệm:
```text
backend/app/services/flood_queue/
├── __init__.py                      # Export Facade class hoặc function chính
├── models.py                        # Queue item models, internal states (< 150 dòng)
├── worker.py                        # Background processing task (< 220 dòng)
├── priority_calculator.py           # Thuật toán tính độ ưu tiên / score (< 180 dòng)
└── persistence.py                   # Đọc/ghi Redis hoặc SQLite / state store (< 200 dòng)
```

---

## 5. Quy Trình Thực Thi & Kiểm Tra (Verification)

Mỗi lần refactor một file:

1. **Đo đếm số dòng trước khi làm:**
   ```bash
   wc -l <target-file>
   ```
2. **Tiến hành tách code** theo các bước:
   - Tạo folder module mới.
   - Trích xuất types/models -> hooks/sub-modules -> kết nối lại file gốc.
3. **Kiểm tra độ dài tất cả các file sau khi tách:**
   ```bash
   wc -l <path-to-folder>/*
   # Đảm bảo không có file nào > 250 dòng
   ```
4. **Kiểm tra lỗi biên dịch / Type check:**
   - **Frontend:**
     ```bash
     cd frontend && npx tsc --noEmit
     ```
   - **Backend:**
     ```bash
     pytest backend/tests/
     pytest camera-backend/tests/
     ```
