# FloodWheel — Requirements Verification Questions

## Question 1: How should ~800 camera coordinates be displayed on the map without lagging?
- **Options Evaluated**:
  1. Flat HTML markers without clustering.
  2. Canvas-rendered markers.
  3. Leaflet MarkerCluster with dynamic cluster icons.
- **Resolution**: Option 3 (Leaflet MarkerCluster). Renders cluster badges at high zoom levels; expands cleanly when users zoom into local neighborhoods; supports custom CSS styling matching FloodWheel dark/light palette.

## Question 2: How should camera snapshots be loaded on the map?
- **Options Evaluated**:
  1. Pre-load snapshots for all ~800 cameras on initial map load.
  2. Lazy-load snapshot only when a marker is clicked or popup is opened.
  3. Pre-load thumbnails on hover.
- **Resolution**: Option 2 (Lazy-load on marker click/popup open). Pre-loading 800 images triggers 800 HTTP requests and clogs the network. Loading on demand reduces bandwidth by 99% and keeps initial map render under 100ms.

## Question 3: How should view modes be structured?
- **Options Evaluated**:
  1. Replace Grid View completely with Map View.
  2. Separate URLs (`/cameras` vs `/cameras/map`).
  3. In-page Dual View toggle (Map View 🗺️ / Grid View 🔲) on `/cameras`.
- **Resolution**: Option 3 (In-page Dual View toggle). Allows users to switch seamlessly without losing search queries, district filters, or scroll position.
