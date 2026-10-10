# FloodWheel — Execution Plan (English Localization)

## 1. Plan Overview
This execution plan defines the Construction Phase roadmap for transforming FloodWheel from a Vietnamese-language implementation into an English-native platform across all layers of the stack.

## 2. Construction Phases & Milestones

```
Phase 1: Backend & AI Engine Localization
├── UOW-LOC-001: VLRDR Prompt & Gemini Client English Enforcement
├── UOW-LOC-002: Backend Alert Engine & Detour Routing Localization
└── UOW-LOC-003: Seed Data & Database Geographies Localization

Phase 2: Demo Sandbox & Benchmark Dataset Localization
├── UOW-LOC-004: Benchmark Dataset English Translation (12 Scenarios)
└── UOW-LOC-005: Demo Playground & Result Card UI Localization

Phase 3: Public Portal & Operator Console Localization
├── UOW-LOC-006: Global Navigation & Page Meta Localization
├── UOW-LOC-007: Landing Page (/) Full English Copy
├── UOW-LOC-008: Real-Time Heatmap & Depth Scale Legend Localization
├── UOW-LOC-009: Operator Command Dashboard & Telemetry Localization
└── UOW-LOC-010: Emergency Alert Sidebar & Override Dialog Localization

Phase 4: Verification & Integration Validation
└── UOW-LOC-011: Full-Stack Verification & Test Suite Execution
```

## 3. Detailed Phase Breakdown

### Phase 1: Core AI Inference & Backend Service Localization
- **Goal**: Guarantee that any API call or Gemini vision inference produces pure English text strings for `reasoning`, `alert_message`, and `detour_advice`.
- **Target Files**:
  - `backend/app/services/vlrdr_prompt.py`
  - `backend/app/services/gemini_client.py`
  - `backend/app/services/threshold_monitor.py`
  - `backend/app/services/route_scorer.py`
  - `backend/app/services/zone_aggregator.py`
  - `backend/app/services/flood_reading_parser.py`
  - `backend/app/db/seed_data.py`
- **Estimated Points**: 12 Story Points

### Phase 2: Demo Sandbox & Benchmark Dataset Localization
- **Goal**: Provide an English-language interactive AI playground on `/demo` for evaluators and judges.
- **Target Files**:
  - `frontend/data/benchmarkDataset.ts`
  - `frontend/components/DemoUpload.tsx`
  - `frontend/components/ResultCard.tsx`
  - `frontend/pages/demo.tsx`
- **Estimated Points**: 10 Story Points

### Phase 3: Public Portal & Operator Console Localization
- **Goal**: Localize all navigation, landing page marketing and technical copy, live vector map, operator controls, and emergency alerts.
- **Target Files**:
  - `frontend/components/Navbar.tsx`
  - `frontend/pages/_app.tsx`
  - `frontend/pages/index.tsx`
  - `frontend/pages/dashboard.tsx`
  - `frontend/components/FloodMap.tsx`
  - `frontend/components/ZoneDetailPanel.tsx`
  - `frontend/components/AlertSidebar.tsx`
  - `frontend/components/OverrideDialog.tsx`
- **Estimated Points**: 16 Story Points

### Phase 4: Verification, Linting & Build Quality
- **Goal**: Execute test suites and Next.js production build verification.
- **Validation**:
  - Backend unit test validation.
  - Frontend TypeScript & Next.js production build validation.
  - Zero remaining Vietnamese text strings in user-facing surfaces.
- **Estimated Points**: 4 Story Points

## 4. Total Effort Estimation
- **Total Units of Work**: 11 UOWs
- **Total Story Points**: 42 Story Points
- **Risk Level**: Low (Targeted string and prompt refactoring; zero breaking architectural changes).
