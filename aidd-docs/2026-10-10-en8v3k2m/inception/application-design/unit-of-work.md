# FloodWheel — Units of Work (UOW) Specification

## Unit Catalog

| UOW ID | Title | Layer | Target Files | Points |
|---|---|---|---|---|
| **UOW-LOC-001** | VLRDR Prompt & Gemini Client English Enforcement | Backend AI | `backend/app/services/vlrdr_prompt.py`, `backend/app/services/gemini_client.py` | 4 |
| **UOW-LOC-002** | Alert Engine & Detour Routing Localization | Backend Services | `backend/app/services/threshold_monitor.py`, `backend/app/services/route_scorer.py`, `backend/app/services/zone_aggregator.py`, `backend/app/services/flood_reading_parser.py` | 4 |
| **UOW-LOC-003** | Seed Data & Database Geographies Localization | Backend DB | `backend/app/db/seed_data.py` | 4 |
| **UOW-LOC-004** | Benchmark Dataset English Translation (12 Scenarios) | Frontend Data | `frontend/data/benchmarkDataset.ts` | 5 |
| **UOW-LOC-005** | Demo Playground & Result Card UI Localization | Frontend UI | `frontend/pages/demo.tsx`, `frontend/components/DemoUpload.tsx`, `frontend/components/ResultCard.tsx` | 5 |
| **UOW-LOC-006** | Global Navigation & Page Meta Localization | Frontend Shell | `frontend/components/Navbar.tsx`, `frontend/pages/_app.tsx` | 3 |
| **UOW-LOC-007** | Landing Page (/) Full English Copy | Frontend Pages | `frontend/pages/index.tsx` | 4 |
| **UOW-LOC-008** | Real-Time Heatmap & Depth Scale Legend Localization | Frontend UI | `frontend/components/FloodMap.tsx` | 3 |
| **UOW-LOC-009** | Operator Dashboard & Zone Detail Panel Localization | Frontend UI | `frontend/pages/dashboard.tsx`, `frontend/components/ZoneDetailPanel.tsx` | 3 |
| **UOW-LOC-010** | Emergency Alert Sidebar & Override Dialog Localization | Frontend UI | `frontend/components/AlertSidebar.tsx`, `frontend/components/OverrideDialog.tsx` | 3 |
| **UOW-LOC-011** | Full-Stack Verification & Test Execution | QA / Build | `backend/tests/*`, Next.js build | 4 |

---

## Detailed Unit Specifications

### UOW-LOC-001: VLRDR Prompt & Gemini Client English Enforcement
- **Description**: Update `VLRDRPromptBuilder` to explicitly require English reasoning and English alerts from Gemini 3.8 Flash. Update `gemini_client.py` offline mock output with realistic English text.
- **Deliverables**:
  - `backend/app/services/vlrdr_prompt.py`: Schema specification enforcing English output.
  - `backend/app/services/gemini_client.py`: Realistic English mock response.

### UOW-LOC-002: Alert Engine & Detour Routing Localization
- **Description**: Convert all backend text generation to English across emergency alerts, route safety detours, and aggregator active alerts.
- **Deliverables**:
  - `backend/app/services/threshold_monitor.py`: English warning broadcast format.
  - `backend/app/services/route_scorer.py`: English detour advice for motorcycles and cars.
  - `backend/app/services/zone_aggregator.py`: English alert label formatting.
  - `backend/app/services/flood_reading_parser.py`: English fallback error messaging.

### UOW-LOC-003: Seed Data & Database Geographies Localization
- **Description**: Update seed database records with standardized English transliteration and descriptive naming for zones and CCTV cameras.
- **Deliverables**:
  - `backend/app/db/seed_data.py`: Localized zone names ("Nguyen Huu Canh Corridor", etc.) and camera labels.

### UOW-LOC-004: Benchmark Dataset English Translation (12 Scenarios)
- **Description**: Translate all 12 benchmark scenarios in `frontend/data/benchmarkDataset.ts` (dry pavement, moderate inundation, deep water).
- **Deliverables**:
  - `frontend/data/benchmarkDataset.ts`: 12 scenarios with English title, location, and landmark bullet points.

### UOW-LOC-005: Demo Playground & Result Card UI Localization
- **Description**: Convert the interactive AI testing playground (`/demo`), upload widget, and inference result display into English.
- **Deliverables**:
  - `frontend/pages/demo.tsx`: Header, technical methodology cards.
  - `frontend/components/DemoUpload.tsx`: Tabs, drag-and-drop, camera angle selector, analyze CTA.
  - `frontend/components/ResultCard.tsx`: Landmark list, AI reasoning, depth scale badge, public alert banner.

### UOW-LOC-006: Global Navigation & Page Meta Localization
- **Description**: Convert Navbar branding, links, live badge, and document `<head>` metadata to English.
- **Deliverables**:
  - `frontend/components/Navbar.tsx`: English brand and links.
  - `frontend/pages/_app.tsx`: English title and meta description.

### UOW-LOC-007: Landing Page (/) Full English Copy
- **Description**: Transform the entire landing page (`frontend/pages/index.tsx`) into persuasive, high-impact English.
- **Deliverables**:
  - `frontend/pages/index.tsx`: Hero banner, problem breakdown, VLRDR principles, metrics counters, live demo links.

### UOW-LOC-008: Real-Time Heatmap & Depth Scale Legend Localization
- **Description**: Translate the vector map header, depth scale legend (Levels 0–5), and interactive popups into English.
- **Deliverables**:
  - `frontend/components/FloodMap.tsx`: English legend, banner, and marker popups.

### UOW-LOC-009: Operator Dashboard & Zone Detail Panel Localization
- **Description**: Translate the operations console (`/dashboard`) and slide-out zone telemetry drawer into English.
- **Deliverables**:
  - `frontend/pages/dashboard.tsx`: Command center metric cards and hotspots list.
  - `frontend/components/ZoneDetailPanel.tsx`: Vehicle passability matrix, camera counts, override button.

### UOW-LOC-010: Emergency Alert Sidebar & Override Dialog Localization
- **Description**: Translate the emergency red alert sidebar and manual override modal into English.
- **Deliverables**:
  - `frontend/components/AlertSidebar.tsx`: Red alert feed and empty state.
  - `frontend/components/OverrideDialog.tsx`: Override form fields, validity period, and buttons.

### UOW-LOC-011: Full-Stack Verification & Test Execution
- **Description**: Validate test suites and run Next.js compilation check to ensure complete integrity.
- **Deliverables**:
  - Clean test run and production build.
