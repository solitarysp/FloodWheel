# FloodWheel — Component Inventory

## 1. Existing Components

| Component | Path | Current State & Limitations |
|---|---|---|
| `CamerasPage` | `frontend/pages/cameras.tsx` | Displays cameras purely in a vertical grid of `CameraCard` elements. No spatial overview. |
| `CameraCard` | `frontend/components/CameraCard.tsx` | Card displaying camera snapshot, auto-refresh countdown, and analyze button. |
| `FloodMap` | `frontend/components/FloodMap.tsx` | SVG diagram for 4 static flood zones on the dashboard. Does not display camera pins. |
| `CameraAnalysisModal` | `frontend/components/CameraAnalysisModal.tsx` | Displays AI analysis results (confidence, depth cm, reasoning, landmarks). |

## 2. New & Enhanced Components

| Component | Path | Proposed Responsibility |
|---|---|---|
| `CameraMap` | `frontend/components/CameraMap.tsx` | Interactive Leaflet map plotting all cameras with clustering, custom status pins, search & district synchronization. |
| `CameraMapPopup` | `frontend/components/CameraMapPopup.tsx` | Lightweight popup card with live snapshot feed, quick details, and action triggers. |
| `CamerasPage` (updated) | `frontend/pages/cameras.tsx` | Houses view toggle header (Grid vs Map), responsive map container, and shared filter bar. |
