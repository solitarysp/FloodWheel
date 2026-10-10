# Stage 2: Reverse Engineering — Component Inventory

## Frontend Component Inventory & Extension Plan

| Component | Path | Status | Role & Extension |
|---|---|---|---|
| `Navbar` | `frontend/components/Navbar.tsx` | Existing | Add "Live Cameras" route button with camera icon badge. |
| `LiveCamerasPage` | `frontend/pages/cameras.tsx` | **NEW** | Main public camera directory: header controls, filter by district/status, auto-refresh interval select, grid layout. |
| `CameraCard` | `frontend/components/CameraCard.tsx` | **NEW** | Individual camera feed display: proxied live image, status badge, camera angle, zone name, refresh button, "📸 Capture & Analyze" button. |
| `CameraAnalysisModal` | `frontend/components/CameraAnalysisModal.tsx` | **NEW** | Modal popping up on analysis: displays captured frame, VLRDR depth gauge (cm), landmark chips, vehicle passability icons, AI reasoning text. |
| `AddCameraModal` | `frontend/components/AddCameraModal.tsx` | **NEW** | Form modal allowing operators to register a new public camera stream URL with instant connection test. |
| `FloodMap` | `frontend/components/FloodMap.tsx` | Existing | Support clicking on camera markers to open live camera snapshot preview directly on map. |
| `Dashboard` | `frontend/pages/dashboard.tsx` | Existing | Add "Quick Cameras" preview row showing online cameras and rapid snapshot triggers. |
