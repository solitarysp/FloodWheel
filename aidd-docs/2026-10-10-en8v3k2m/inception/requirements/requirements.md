# FloodWheel — Requirements Specification (English Localization)

## 1. Functional Requirements (FR)

### FR-LOC-01: Landing & Showcase UI Localization
- **Description**: The home page (`frontend/pages/index.tsx`) must display all typography, headlines, technical descriptions, value proposition metrics, and call-to-action buttons in clear, idiomatic English.
- **Scope**:
  - Title & Meta: "FloodWheel — Real-Time Urban Flood Depth Intelligence From Traffic Cameras"
  - Hero Header: "Real-Time Urban Flood Depth Intelligence From Traffic Cameras (Zero Hardware Sensors Required)"
  - Problem Statement: Monsoon inundation challenges in Asian megacities, blind spots for citizens and emergency services.
  - VLRDR Technology Pillars: Visual landmark relative depth reasoning using motorcycle wheels (~50cm), exhaust pipes (~30-35cm), car door sills (~25-30cm), and curbs (~15cm).
  - Live Heatmap & Safe Routing Callouts.

### FR-LOC-02: Live Demo Sandbox Localization
- **Description**: The interactive testing playground (`frontend/pages/demo.tsx` & `DemoUpload.tsx` & `ResultCard.tsx`) must be fully translated into English.
- **Scope**:
  - Tab navigation: "Preset Street Benchmark" and "Upload Custom Camera Photo".
  - Camera angle selection: "Elevated (Traffic Pole)", "Street Level", "Overhead / Bridge".
  - Action button: "Analyze Flood Depth (Gemini VLRDR)".
  - Result view: "Physical Landmarks Identified", "Submersion Reasoning", "Depth Scale Gauge", "Actionable Public Advisory", and "Inference Metrics".

### FR-LOC-03: Operator Command Dashboard Localization
- **Description**: The municipal flood operations console (`frontend/pages/dashboard.tsx`, `FloodMap.tsx`, `AlertSidebar.tsx`, `ZoneDetailPanel.tsx`, and `OverrideDialog.tsx`) must be completely presented in English.
- **Scope**:
  - Header statistics: "Active Monitoring Cameras", "Flooded Hotspots", "Average Inundation Depth", "Emergency Alerts Active".
  - Map controls: "Real-time Urban Flood Map — Ho Chi Minh City", Depth level legend (0 to 5 with color indicators).
  - Zone Detail panel: Vehicle passability matrix ("Motorcycle: Impassable", "Sedan: High Risk", "High Clearance SUV: Caution"), Active cameras, and Last updated timestamp.
  - Emergency Alert Sidebar: "Critical Red Alerts (Level ≥ 3)", real-time emergency feed, empty state badge.
  - Override dialog: "Manual Flood Level Override", duration in hours, operator justification, submit/cancel.

### FR-LOC-04: Benchmark Dataset English Annotations
- **Description**: All 12 scenarios in `frontend/data/benchmarkDataset.ts` must have titles, locations, and visual landmark bullet points converted to English.
- **Scope**:
  - Dry street scenarios (Levels 0–1): "Dry urban street during normal traffic flow", "Clear road pavement with crisp lane markings".
  - Moderate inundation scenarios (Levels 2–3): "Motorcycle traversing floodwater up to exhaust tip", "Water reaching half wheel diameter".
  - Severe inundation scenarios (Levels 4–5): "Vehicles stalled in deep water", "Submerged car door sills", "Road closed barricade".

### FR-LOC-05: Gemini Vision Prompt Enforcement
- **Description**: `VLRDRPromptBuilder` must instruct Gemini 3.8 Flash to return English text for both `reasoning` and `alert_message`.
- **Scope**:
  - Update prompt schema description to: `"reasoning": "Clear description of visual landmarks detected and water contact points in English"`.
  - Update alert message description to: `"alert_message": "Actionable public alert message summarizing water depth and road passability in English"`.
  - Update mock analysis fallback in `gemini_client.py` to return authentic English sample reasoning and alert copy.

### FR-LOC-06: Backend Service & Detour Routing Localization
- **Description**: All backend-generated strings returned by API endpoints must be in English.
- **Scope**:
  - `threshold_monitor.py`: "CRITICAL FLOOD ALERT: {zone_name} is at Level {level} ({min}-{max}cm). Exhaust pipes submerged. Avoid this route!"
  - `route_scorer.py`: "Safe route: no severe flood zones detected." and "WARNING: Route crosses Flood Level {level} (up to {max_depth}cm). Detour recommended."
  - `zone_aggregator.py`: "Flood Alert: {min}-{max}cm".
  - `flood_reading_parser.py`: Fallback error messages in English.
  - `seed_data.py`: Localized zone names (e.g. "Nguyen Huu Canh Corridor", "Vo Van Ngan Incline", "Quoc Huong Street", "Le Loi Boulevard").

---

## 2. Non-Functional Requirements (NFR)
- **NFR-LOC-01 (UI Responsiveness & Layout Preservation)**: English translations must not cause UI truncation, text clipping, or broken grid layouts across mobile, tablet, and desktop breakpoints.
- **NFR-LOC-02 (API Backward Compatibility)**: All JSON field keys in REST request and response payloads must remain identical (`depth_level`, `depth_estimate_cm_min`, `reasoning`, `alert_message`, `safety_score`, etc.). Only string values are translated.
- **NFR-LOC-03 (Performance)**: Language changes must have zero impact on latency (< 1 second Gemini inference, < 50ms API response time).
- **NFR-LOC-04 (Localization Completeness)**: 100% of user-visible Vietnamese strings on web pages, components, notifications, and demo datasets must be converted to English.
