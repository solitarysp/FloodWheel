# FloodWheel — Application Design: Components (English Localization)

## 1. UI Component Specifications

### 1.1 `Navbar.tsx`
- **Location**: `frontend/components/Navbar.tsx`
- **Design Objective**: Universal top-level navigation with branded identity and live system telemetry.
- **English String Mapping**:
  - Brand Title: `"FloodWheel"`
  - Brand Subtitle: `"Urban Flood Depth Mapping"`
  - Nav Item 1: `"Overview"` (link: `/`)
  - Nav Item 2: `"Gemini AI Demo"` (link: `/demo`)
  - Nav Item 3: `"Live Map & Operations"` (link: `/dashboard`)
  - System Status: `"System Online"` (Green pulsing badge)
  - GitHub / Repo Link: `"GitHub"`

### 1.2 `FloodMap.tsx`
- **Location**: `frontend/components/FloodMap.tsx`
- **Design Objective**: Full-viewport vector map displaying Ho Chi Minh City flood polygons, camera pins, and color-coded depth severity.
- **English String Mapping**:
  - Title Banner: `"Real-Time Urban Flood Map — Ho Chi Minh City"`
  - Status Subtitle: `"Zero-sensor depth mapping powered by traffic cameras & Gemini Vision"`
  - Depth Scale Legend:
    - Level 0 (Cyan/Green): `"Level 0: Dry (0cm)"`
    - Level 1 (Light Blue): `"Level 1: Minor (5–15cm)"`
    - Level 2 (Yellow): `"Level 2: Caution (15–30cm)"`
    - Level 3 (Orange): `"Level 3: Impassable for 2-wheelers (30–45cm)"`
    - Level 4 (Red): `"Level 4: Severe / Sedans Stalled (45–70cm)"`
    - Level 5 (Purple): `"Level 5: Catastrophic (>70cm)"`
  - Map Markers & Popups: `"Camera"`, `"View Stream"`, `"Current Depth"`, `"Zone Details"`

### 1.3 `DemoUpload.tsx`
- **Location**: `frontend/components/DemoUpload.tsx`
- **Design Objective**: Multi-tab testing interface allowing instant selection of preset benchmarks or upload of custom images.
- **English String Mapping**:
  - Tab 1: `"Preset Street Scenarios"`
  - Tab 2: `"Custom Camera Image"`
  - Drag & Drop Zone: `"Drag & drop a street CCTV image here, or browse files"`
  - Supported Formats: `"Supports JPEG, PNG, WebP (Max 10MB)"`
  - Camera Perspective Label: `"Camera Perspective / Angle:"`
    - Elevated Option: `"Elevated (Pole Mounted ~4-6m)"`
    - Street Level Option: `"Street Level (~1.5-2.5m)"`
    - Overhead Option: `"Overhead / Flyover (>8m)"`
  - Action Button: `"Analyze Flood Depth (Gemini VLRDR)"`
  - Analyzing Spinner: `"Analyzing visual landmarks with Gemini 3.8 Flash..."`

### 1.4 `ResultCard.tsx`
- **Location**: `frontend/components/ResultCard.tsx`
- **Design Objective**: Detailed breakdown of Gemini Vision's spatial depth measurement.
- **English String Mapping**:
  - Header: `"Gemini VLRDR Inference Analysis"`
  - Depth Level Badge: `"Level {depth_level} — {SeverityTitle}"`
  - Estimated Depth Range: `"Estimated Depth: {min} – {max} cm"`
  - Confidence Gauge: `"Confidence Score: {Math.round(confidence * 100)}%"`
  - Processing Latency: `"Processing Time: {latency_ms}ms (Model: {model_version})"`
  - Landmark Section Title: `"Physical Landmarks Identified:"`
  - AI Reasoning Section Title: `"Visual Landmark Relative Depth Reasoning:"`
  - Public Advisory Banner: `"Actionable Mobility Advisory:"`

### 1.5 `ZoneDetailPanel.tsx`
- **Location**: `frontend/components/ZoneDetailPanel.tsx`
- **Design Objective**: Slide-out drawer displaying in-depth telemetry for the selected flood polygon.
- **English String Mapping**:
  - Header: `"Flood Zone Telemetry"`
  - District & City Tag: `"{district}, {city}"`
  - Depth Metric: `"Current Depth: {min} – {max} cm"`
  - Passability Matrix:
    - Two-Wheelers / Scooters: `"Motorcycles: {Passable | Caution | Impassable (Exhaust Submerged)}"`
    - Sedans / Low Clearance: `"Sedans / Taxis: {Passable | Risk of Engine Stall | Impassable}"`
    - SUVs & Trucks: `"High-Clearance SUVs: {Passable | Drive with Caution | Extreme Caution}"`
  - Reporting Cameras: `"{count} CCTV cameras actively monitoring"`
  - Manual Override Button: `"Manual Override Level"`
  - Close Button: `"Close Panel"`

### 1.6 `AlertSidebar.tsx`
- **Location**: `frontend/components/AlertSidebar.tsx`
- **Design Objective**: Real-time ticker for emergency flood conditions (Level ≥ 3).
- **English String Mapping**:
  - Header: `"Critical Red Alerts (Level ≥ 3)"`
  - Empty State: `"No critical flood emergencies in Ho Chi Minh City at this time."`
  - Alert Card Badges: `"CRITICAL"`, `"Severe Inundation"`, `"{time_ago}"`
  - Action: `"Focus on Map"`

### 1.7 `OverrideDialog.tsx`
- **Location**: `frontend/components/OverrideDialog.tsx`
- **Design Objective**: Administrative modal for municipal operators to override AI readings.
- **English String Mapping**:
  - Modal Title: `"Override Flood Depth Level"`
  - Level Selector Label: `"Target Flood Level (0 – 5):"`
  - Min Depth Input Label: `"Minimum Depth (cm):"`
  - Max Depth Input Label: `"Maximum Depth (cm):"`
  - Validity Duration Label: `"Duration of Validity (Hours):"`
  - Justification Label: `"Operator Reason / Field Report Source:"`
  - Confirm Action: `"Apply Override"`
  - Cancel Action: `"Cancel"`
