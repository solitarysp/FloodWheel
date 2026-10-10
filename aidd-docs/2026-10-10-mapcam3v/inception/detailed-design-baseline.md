# FloodWheel — Detailed Design Baseline: Camera Map Visualization

## 1. Executive Summary
- **Session ID**: `2026-10-10-mapcam3v`
- **Feature Scope**: Interactive Map CCTV Visualization with Marker Clustering, Snapshot Previews, and Dual View Toggle
- **Status**: BASELINED 🟢
- **Mode**: Autonomous Mode (Auto-Approve & Auto-Resolve)

## 2. Requirements & Architecture Summary
1. **Interactive Leaflet Engine with Marker Clustering**:
   - Leaflet + `leaflet.markercluster` renders ~800 public traffic cameras across HCMC without lag.
   - Zero proprietary API key requirement (uses open CartoDB Positron / OSM tiles).
   - SSR-safe via Next.js `dynamic(..., { ssr: false })`.
2. **On-Demand Snapshot & AI Analysis**:
   - Clicking a camera marker renders an interactive popup.
   - Popups fetch live snapshots on demand (`/api/v1/cameras/{id}/snapshot`), minimizing initial bandwidth.
   - Clicking "Analyze with AI" triggers Gemini Vision VLRDR flood depth estimation in `CameraAnalysisModal`.
3. **Dual View Experience**:
   - `/cameras` features a clean segmented control: `[ 🗺️ Map View | 🔲 Grid View ]`.
   - Filters (keyword search, district dropdown) synchronously filter both views.

## 3. Units of Work
- **UOW-MAP-001**: Leaflet & MarkerCluster Setup & Styles
- **UOW-MAP-002**: Interactive `CameraMap` Component Implementation
- **UOW-MAP-003**: Cameras Page Dual View Toggle Integration

## 4. Quality & Performance Criteria
- Cluster rendering latency < 200ms.
- 60 fps panning and zooming.
- Zero hydration errors on page load.
