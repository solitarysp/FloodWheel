# FloodWheel — Requirements Specification: Camera Map Visualization

## 1. Functional Requirements (FR)

### FR-01: Interactive Map Component (`CameraMap`)
- **FR-01.1**: The system must provide an interactive Leaflet map centered on Ho Chi Minh City (`[10.7769, 106.7009]`, zoom level 12).
- **FR-01.2**: Every camera in the active dataset with valid `latitude` and `longitude` must be plotted as a customized map marker.
- **FR-01.3**: Camera markers must indicate status visually (green glowing pin for `ONLINE` / `UP`, amber/gray for `OFFLINE`).

### FR-02: High-Performance Marker Clustering
- **FR-02.1**: Markers within close geographic proximity must automatically group into cluster badges when zoomed out.
- **FR-02.2**: Clicking a cluster badge must zoom into its bounding box to reveal individual markers.
- **FR-02.3**: Clusters must display the count of cameras inside the cluster with color-coded gradients (e.g. blue for small, purple for medium, indigo for large clusters).

### FR-03: On-Demand Snapshot Preview Popup
- **FR-03.1**: Clicking an individual marker must display a responsive popup card with:
  - Live snapshot image fetched from `/api/v1/cameras/{id}/snapshot`.
  - Camera name, district, and coordinates.
  - Status badge (Online / Offline).
  - Refresh button to reload snapshot.
  - "Analyze with AI" button that opens `CameraAnalysisModal` for flood depth measurement.
- **FR-03.2**: Popup image loading must show a spinner placeholder and handle fallback states gracefully.

### FR-04: Dual View Toggle on `/cameras`
- **FR-04.1**: A segmented control toggle on `/cameras` must allow users to switch between **Map View 🗺️** and **Grid View 🔲**.
- **FR-04.2**: The active search query, district filter, and status filter must apply to both views synchronously.
- **FR-04.3**: Switching between views must persist the user's active filter selections without page reloading.

---

## 2. Non-Functional Requirements (NFR)

### NFR-01: Performance & Responsiveness
- Initial map render must complete in under **200ms**.
- Panning and zooming with ~800 cameras clustered must sustain **60 fps** without UI stutter.

### NFR-02: Zero External API Token Dependency
- Map tiles must load from public open tile services (CartoDB Positron / OSM) without requiring proprietary access tokens.

### NFR-03: SSR Safety in Next.js
- The map component must be rendered on the client side only (`next/dynamic` with `ssr: false`), preventing `"window is not defined"` SSR exceptions.
