# FloodWheel — Component Inventory

## 1. Frontend UI Components
| Component | Location | Role & Functionality | Key Localized Text Elements |
|---|---|---|---|
| **Navbar** | `frontend/components/Navbar.tsx` | Global top navigation bar | Brand name, links ("Overview", "Live Heatmap", "Gemini AI Demo", "Operator Console"), live status badge ("System Live") |
| **FloodMap** | `frontend/components/FloodMap.tsx` | Interactive vector map rendered via Mapbox GL / Leaflet | Header ("Real-time Urban Flood Map — Ho Chi Minh City"), Depth level legend (0 to 5), Zone popup tooltips, Camera pins, Loading overlays |
| **DemoUpload** | `frontend/components/DemoUpload.tsx` | Interactive Gemini AI demo upload interface | Tab selector ("Preset Street Benchmark", "Upload Custom Camera Photo"), Drag & Drop zone ("Drop camera image here"), Camera angle buttons ("Elevated (Pole)", "Street Level", "Overhead"), Submit CTA ("Analyze Flood Depth (Gemini VLRDR)") |
| **ResultCard** | `frontend/components/ResultCard.tsx` | AI inference result display | Header ("VLRDR AI Analysis Result"), Depth level badge (e.g. "Level 3: Critical Flood"), Confidence gauge ("Confidence"), Identified landmarks list, AI reasoning box, Actionable warning banner |
| **ZoneDetailPanel** | `frontend/components/ZoneDetailPanel.tsx` | Slide-out panel for selected flood zone | Zone header, depth telemetry (min-max cm), Passability matrix ("Motorcycle: Impassable", "Sedan: High Risk", "High Clearance SUV: Caution"), Active cameras list, Override button |
| **OverrideDialog** | `frontend/components/OverrideDialog.tsx` | Operator modal to override depth level | Dialog title ("Manual Flood Level Override"), Override level selector (0–5), Min/Max depth inputs, Validity period (hours), Reason input, Save/Cancel buttons |
| **AlertSidebar** | `frontend/components/AlertSidebar.tsx` | Real-time emergency sidebar | Header ("Critical Red Alerts (Level ≥ 3)"), Alert cards with zone name, depth level, and timestamp, Empty state ("No critical flood emergencies in the metropolitan area") |

## 2. Page Views
| Page | File | Purpose | Key Localized Text Elements |
|---|---|---|---|
| **Home Page** | `frontend/pages/index.tsx` | Public landing & product showcase | Hero headline ("Real-Time Urban Flood Depth Intelligence From Traffic Cameras"), Subheading ("Zero physical sensors required"), Feature cards (VLRDR Vision, Real-Time Heatmap, Route Safety), Metrics counters, Call-to-action buttons |
| **Demo Page** | `frontend/pages/demo.tsx` | Interactive sandbox for testing VLRDR | Title ("Gemini Vision AI Depth Estimator Playground"), Explanatory cards on motorcycle calibration methodology, Preset benchmark grid, Live analysis trigger |
| **Dashboard Page** | `frontend/pages/dashboard.tsx` | Operational command center | Metrics bar ("Active Monitoring Cameras", "Flooded Hotspots", "Average Inundation Depth", "Emergency Alerts Active"), Full-screen map view, Zone inspector, Emergency alert feed |
| **Root App** | `frontend/pages/_app.tsx` | HTML Shell & Head meta | Document `<title>` and `<meta name="description">` tags |

## 3. Data Collections
| Dataset | Location | Content |
|---|---|---|
| **Benchmark Dataset** | `frontend/data/benchmarkDataset.ts` | 12 high-resolution benchmark street scenarios (4 dry pavement, 4 moderate floods, 4 severe floods) with physical landmarks, location descriptions, and expected depth calibrations. |
