# FloodWheel — Execution Plan: Camera Map Visualization

## Construction Phase Roadmap

### Phase 1: Frontend Map Foundation & Dependencies
- **Goal**: Install Leaflet & MarkerCluster libraries and configure Next.js dynamic client-side loading.
- **Tasks**:
  1. Add `leaflet`, `@types/leaflet`, `leaflet.markercluster`, `@types/leaflet.markercluster` to `frontend/package.json`.
  2. Import Leaflet CSS and MarkerCluster CSS in `frontend/styles/globals.css` or `_app.tsx`.
  3. Verify TypeScript builds and SSR safety.

### Phase 2: Interactive CameraMap Component
- **Goal**: Implement `CameraMap` with clustering and custom status marker pins.
- **Tasks**:
  1. Create `frontend/components/CameraMap.tsx` with Leaflet initialization, CartoDB Positron / OSM tile layer.
  2. Implement marker clustering with custom HTML icon styling for online and offline cameras.
  3. Implement popup card with live snapshot image, name, district, refresh button, and "Analyze with AI" trigger.

### Phase 3: Page Integration & Dual View Mode
- **Goal**: Integrate `CameraMap` into `frontend/pages/cameras.tsx` with view switcher.
- **Tasks**:
  1. Add segmented toggle `[ 🗺️ Map View | 🔲 Grid View ]` to `/cameras` filter bar.
  2. Wire filtered cameras and search queries to both views.
  3. Dynamically import `CameraMap` with `ssr: false` to ensure zero hydration mismatch.

### Phase 4: Verification & Polishing
- **Goal**: End-to-end testing, responsive styling, and performance verification.
- **Tasks**:
  1. Test clustering performance with ~800 HCMC cameras.
  2. Test snapshot preview and AI depth analysis flow from map popups.
  3. Validate mobile responsiveness.
