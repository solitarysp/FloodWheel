# FloodWheel — Application Design: Components

## 1. Component Registry

### `CameraMap` (`frontend/components/CameraMap.tsx`)
- **Type**: React Client Component (`"use client"` or Next.js `dynamic(..., { ssr: false })`).
- **Props**:
  - `cameras`: Array of `Camera` objects (`id`, `name`, `latitude`, `longitude`, `status`, `district`, `stream_url`).
  - `onAnalyze`: Callback function `(camera: Camera, frameBase64?: string) => void`.
  - `selectedCameraId`: Optional ID of a camera to highlight and center.
  - `className`: Optional wrapper CSS class names.
- **Responsibilities**:
  - Initializes Leaflet Map instance on DOM mount.
  - Adds CartoDB Positron / OSM tile layer.
  - Creates `L.markerClusterGroup` with custom cluster icon styling.
  - Binds click popups showing live snapshot images and metadata.
  - Cleans up Leaflet instance on unmount to prevent memory leaks.

### `CamerasPage` (`frontend/pages/cameras.tsx` - Enhanced)
- **Responsibilities**:
  - Holds state for `viewMode: "grid" | "map"`.
  - Renders the view mode toggle buttons.
  - Passes filtered cameras to `CameraMap` or `CameraCard` grid.
  - Handles the AI analysis modal triggers from either view.
