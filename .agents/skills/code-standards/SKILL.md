---
name: code-standards
description: >-
  Áp dụng tiêu chuẩn code và chiến lược refactor cho dự án FloodWheel (Frontend & Backend).
  Kích hoạt khi viết code mới, refactor, tái cấu trúc thư mục, kiểm tra số dòng code, hoặc sửa bug.
  Quy tắc cốt lõi: mỗi file code không dài quá 250 dòng (tốt nhất <= 200 dòng).
---

# FloodWheel Code Standards & Refactoring Guide

Hướng dẫn toàn diện về quy chuẩn code, công cụ kiểm tra số dòng code nhanh, và **chiến lược tái cấu trúc thư mục (Folder Architecture & Refactor Guide)** cho dự án **FloodWheel**.

---

## 1. Công Cụ Kiểm Tra Nhanh Số Dòng Code

Script kiểm tra tự động đã được tích hợp ngay bên trong skill:
- **Đường dẫn script:** `.agents/skills/code-standards/check_line_limits.py`
- **Lệnh chạy nhanh từ root project:**
  ```bash
  python3 .agents/skills/code-standards/check_line_limits.py
  ```
- **Tiêu chí đánh giá:**
  - `> 250 dòng`: ❌ **Vi phạm (Hard Limit)** - Bắt buộc refactor phân tách.
  - `201 – 250 dòng`: ⚠️ **Cảnh báo (Warning)** - Khuyến nghị refactor sớm.
  - `<= 200 dòng`: ✅ **Đạt chuẩn (Optimal)**.

---

## 2. Quy Tắc Giới Hạn Chiều Dài File (Core Rule)

- **Quy tắc cứng:** Mỗi file code **không dài hơn 250 dòng**.
- **Ngưỡng tối ưu:** Ưu tiên duy trì mỗi file trong khoảng **100 – 200 dòng** code.
- **Yêu cầu thực thi:** Khi bổ sung tính năng mới hoặc một file vượt ngưỡng 200 dòng, bắt buộc phân tách module con theo cấu trúc thư mục chuẩn bên dưới.

---

## 3. Kiến Trúc Cấu Trúc Thư Mục Chuẩn (Target Folder Architecture)

### 3.1. Frontend (`frontend/`) - Next.js (Pages Router) & React

```text
frontend/
├── components/
│   ├── common/                  # Component dung chung (< 150 dong/file): Button, Modal, Card, Badge
│   ├── layout/                  # Navbar, Footer, Sidebar, Layout container
│   ├── map/                     # Bản đồ & Leaflet logic
│   │   ├── types.ts             # Map types & interfaces
│   │   ├── hooks/               # useMapBounds.ts, useMapMarkers.ts (< 150 dong)
│   │   ├── subcomponents/       # MarkerPopup.tsx, MapLegend.tsx (< 150 dong)
│   │   └── CameraMap.tsx        # Container rap layout ban do (< 200 dong)
│   ├── admin/                   # Tách từ pages/admin.tsx (hiện ~2600 dòng)
│   │   ├── types.ts             # Admin DTOs & Table types
│   │   ├── hooks/               # useAdminCameras.ts, useAdminQueue.ts, useAdminLogs.ts
│   │   ├── tabs/                # CameraTab.tsx, QueueTab.tsx, ConfigTab.tsx (< 200 dong)
│   │   └── modals/              # AddCameraModal.tsx, BulkActionModal.tsx (< 180 dong)
│   └── camera/                  # CameraCard.tsx, CameraFilter.tsx, CameraStreamPlayer.tsx
├── hooks/                       # Custom hooks toan cuc: useCameras.ts, useWebSocket.ts, useFloodData.ts
├── services/                    # API client wrappers: api.ts, cameraApi.ts, floodApi.ts (< 150 dong)
├── types/                       # Global interfaces/models: camera.ts, flood.ts, queue.ts
├── utils/                       # Pure utility functions: formatters.ts, geo.ts, constants.ts
└── pages/                       # Next.js Pages chi wrap Layout & goi Component (< 150 dong/file)
    ├── _app.tsx
    ├── index.tsx
    ├── admin.tsx                # Chi gom AdminTabs & Layout (< 150 dong)
    ├── cameras.tsx              # Chi gom CameraFilter & Grid (< 150 dong)
    └── dashboard.tsx            # Chi gom DashboardWidgets (< 150 dong)
```

---

### 3.2. Backend (`backend/` & `camera-backend/`) - FastAPI & Python

```text
backend/app/
├── core/                        # Config, security, logging, database connection (< 150 dong)
│   ├── config.py
│   └── database.py
├── schemas/                     # Pydantic Schemas vao/ra rieng biet (< 150 dong)
│   ├── camera.py
│   ├── flood.py
│   └── queue.py
├── routers/                     # Endpoint controllers
│   ├── admin/                   # Tach tu routers/admin.py (~760 dong)
│   │   ├── __init__.py          # router.include_router(...) (< 40 dong)
│   │   ├── cameras.py           # CRUD camera (< 200 dong)
│   │   ├── queue.py             # Dieukien queue & retry (< 180 dong)
│   │   └── system.py            # Health & config (< 150 dong)
│   ├── flood/                   # Tach tu routers/flood.py (~356 dong)
│   │   ├── __init__.py
│   │   └── analysis.py
│   └── cameras.py               # Camera public routes (< 200 dong)
├── services/                    # Business Logic Layer
│   ├── flood_queue/             # Tach tu flood_queue_service.py (~934 dong)
│   │   ├── __init__.py          # Export facade / main class
│   │   ├── models.py            # Queue internal structures (< 100 dong)
│   │   ├── worker.py            # Background worker task (< 200 dong)
│   │   ├── priority.py          # Thuat toan tinh priority (< 150 dong)
│   │   └── persistence.py       # Luu tru state (< 180 dong)
│   ├── gemini/                  # Tach tu gemini_client.py (~360 dong)
│   │   ├── __init__.py
│   │   ├── client.py            # API transport client (< 180 dong)
│   │   └── prompts.py           # System prompts & schema parsers (< 150 dong)
│   └── flood_analysis_service.py # Core analysis orchestrator (< 200 dong)
└── dependencies/                # Auth, db sessions, pagination params (< 100 dong)
```

---

## 4. Chiến Lược Refactor Từng Bước (Step-by-Step Refactoring Strategy)

Để refactor an toàn tuyệt đối **Zero Breaking Changes**, tuân thủ 5 bước sau:

### Bước 1: Trích xuất Leaf Nodes (Độc lập nhất)
1. Tách **Types / Interfaces / Pydantic Schemas / Enums** ra file riêng trước.
2. Tách **Pure Helpers / Constants / Regex / Prompts** (không phụ thuộc React State hay Database session).

### Bước 2: Trích xuất State & Data Access (Hooks & Services)
1. **Frontend:** Trích xuất các hàm `useEffect`, `useState`, `fetch` thành Custom Hook (ví dụ `useAdminQueue()`).
2. **Backend:** Tách query DB hoặc lời gọi API ngoài thành module service riêng (ví dụ `persistence.py`, `prompts.py`).

### Bước 3: Trích xuất Sub-components / Sub-routers
1. **Frontend:** Cắt từng khối JSX lớn trong file (Table, Modal, Section, Header) thành file component con.
2. **Backend:** Cắt các nhóm endpoint theo resource thành file router con trong thư mục router.

### Bước 4: Tái cấu trúc Entry Point
File gốc (Page hoặc Main Router) lúc này chỉ còn vai trò **Composer / Assembler**:
- Import các sub-components / sub-routers đã tách.
- Ghép nối props/params và điều hướng.
- Độ dài file gốc giảm xuống **< 150 dòng**.

### Bước 5: Kiểm tra xác minh (Verification)
1. Chạy linter / compiler:
   - Frontend: `npm run build` hoặc `npm run type-check`
   - Backend: `python3 -m py_compile <file_vua_sua>`
2. Chạy script kiểm tra dòng:
   ```bash
   python3 .agents/skills/code-standards/check_line_limits.py
   ```
3. Đảm bảo toàn bộ file sau refactor đều nằm trong ngưỡng **<= 200 dòng**.
