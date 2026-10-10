# FloodWheel — Units of Work (UOW): Camera Map Visualization

## UOW-MAP-001: Leaflet & MarkerCluster Setup & Styles
- **Component**: `frontend/package.json`, `frontend/styles/globals.css`, `frontend/next.config.js`
- **Scope**:
  - Add `leaflet`, `@types/leaflet`, `leaflet.markercluster`, `@types/leaflet.markercluster`.
  - Include Leaflet & MarkerCluster CSS stylesheets.
  - Verify styling variables and Next.js CSS compilation.
- **Estimated Complexity**: Low
- **Dependencies**: None

---

## UOW-MAP-002: Interactive CameraMap Component Implementation
- **Component**: `frontend/components/CameraMap.tsx`
- **Scope**:
  - Implement dynamic Leaflet map centered on HCMC coordinates (`10.7769, 106.7009`, zoom 12).
  - Add CartoDB Positron / OSM tile layer.
  - Create MarkerCluster group with custom HTML/SVG status pins.
  - Implement interactive popups displaying camera title, district, status, live snapshot image with spinner placeholder, refresh action, and "Analyze with AI" trigger.
  - Support marker filtering upon search/district query changes.
- **Estimated Complexity**: Medium
- **Dependencies**: UOW-MAP-001

---

## UOW-MAP-003: Cameras Page Dual View Toggle Integration
- **Component**: `frontend/pages/cameras.tsx`
- **Scope**:
  - Add Dual View segmented control: `[ 🗺️ Map View | 🔲 Grid View ]`.
  - Dynamically load `CameraMap` using `next/dynamic` with `ssr: false`.
  - Pass filtered cameras, active search terms, and `handleAnalyze` callback to `CameraMap`.
  - Ensure filter bar and summary badges apply smoothly to both views.
- **Estimated Complexity**: Low
- **Dependencies**: UOW-MAP-002
