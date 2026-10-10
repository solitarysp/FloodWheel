# FloodWheel — Unit of Work Dependency Graph

```mermaid
graph TD
    U1[UOW-MAP-001: Leaflet & MarkerCluster Setup & Styles]
    U2[UOW-MAP-002: Interactive CameraMap Component]
    U3[UOW-MAP-003: Cameras Page Dual View Toggle Integration]

    U1 --> U2
    U2 --> U3
```

- **Execution Flow**:
  1. `UOW-MAP-001`: Configure package dependencies and CSS files.
  2. `UOW-MAP-002`: Build standalone `CameraMap` component.
  3. `UOW-MAP-003`: Wire `CameraMap` into `frontend/pages/cameras.tsx` with view toggle.
