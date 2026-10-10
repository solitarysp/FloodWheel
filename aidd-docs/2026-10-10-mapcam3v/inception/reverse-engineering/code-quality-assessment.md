# FloodWheel — Code Quality Assessment

## 1. Existing State Evaluation
- **Strengths**:
  - `CamerasPage` has robust state management for auto-refresh, search filtering, district selection, and modal handling.
  - `CameraAnalysisModal` provides clear visualization of Gemini VLRDR metrics.
- **Weaknesses & Bottlenecks**:
  - `filteredCameras.map((cam) => <CameraCard .../>)` renders dozens or hundreds of image elements simultaneously, loading up to 100+ snapshots into the DOM concurrently.
  - Zero spatial/geographic representation of camera distribution.
  - Users cannot zoom into a specific road corridor to see cameras along their commute.

## 2. Refactoring Recommendations
- Introduce `CameraMap` as a dynamically loaded Next.js component (`next/dynamic`, `ssr: false`).
- Use clustering so that only visible / focused pins render DOM elements, keeping memory and CPU footprint minimal.
- Load snapshot images only when a popup is opened or when hovering/focusing a pin, saving bandwidth.
