# FloodWheel — Code Structure: Frontend & Map Subsystem

```
frontend/
├── components/
│   ├── CameraMap.tsx                # (NEW) Interactive Leaflet map with clustering & preview
│   ├── CameraMapPopup.tsx           # (NEW) Interactive snapshot card rendered in map popup
│   ├── FloodMap.tsx                 # Existing SVG zone map (dashboard)
│   ├── CameraCard.tsx               # Grid view camera card
│   ├── CameraAnalysisModal.tsx      # Modal displaying Gemini Vision flood depth analysis
│   ├── AddCameraModal.tsx           # Form modal to add custom CCTV stream
│   ├── Navbar.tsx                   # Top navigation bar
│   └── AlertSidebar.tsx             # Real-time flood alert list
├── pages/
│   ├── cameras.tsx                  # (UPDATED) Cameras page with Map/Grid dual toggle
│   ├── dashboard.tsx                # Dashboard with flood heatmap
│   ├── demo.tsx                     # Interactive 3-minute demo
│   └── _app.tsx                     # Global App wrapper with CSS imports
├── styles/
│   └── globals.css                  # (UPDATED) Leaflet and markercluster CSS styles
├── package.json                     # (UPDATED) Added leaflet and types
└── next.config.js                   # Next.js build configuration
```
