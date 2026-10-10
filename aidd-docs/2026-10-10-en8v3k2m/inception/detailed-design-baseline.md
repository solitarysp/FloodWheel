# FloodWheel — Detailed Design Baseline (English Localization)

## 1. System Context & Executive Summary
FloodWheel is an AI-driven, real-time urban flood depth intelligence platform built on Next.js 14, FastAPI, PostgreSQL/PostGIS, and Google Gemini 3.8 Flash Vision. This baseline locks the architectural specifications and localization contracts for transitioning all system surfaces (public marketing portal, interactive testing playground, municipal command console, backend alert dispatchers, route safety scorers, and benchmark datasets) from Vietnamese to native English.

## 2. Component Ownership & Architecture Alignment
| Component / File | Layer | Owner Context | Localization Contract |
|---|---|---|---|
| `backend/app/services/vlrdr_prompt.py` | Backend AI | Inference | Strictly enforce English `reasoning` and `alert_message` outputs in Gemini schema. |
| `backend/app/services/gemini_client.py` | Backend AI | Inference | Realistic English mock analysis for offline & developer testing. |
| `backend/app/services/threshold_monitor.py` | Backend Domain | Telemetry & Alerts | Red alert text template: `"CRITICAL FLOOD ALERT: {zone} is at Level {level}..."` in English. |
| `backend/app/services/route_scorer.py` | Backend Domain | Navigation | English detour notes and vehicle passability guidance. |
| `backend/app/services/zone_aggregator.py` | Backend Domain | Telemetry | English active alert formatting: `["Flood Alert: {min}-{max}cm"]`. |
| `backend/app/services/flood_reading_parser.py` | Backend Domain | Ingestion | English fallback error messages. |
| `backend/app/db/seed_data.py` | Backend DB | Storage | English transliterated names: `"Nguyen Huu Canh Corridor"`, `"Binh Thanh"`, etc. |
| `frontend/data/benchmarkDataset.ts` | Frontend Data | Presentation | Complete English translation of all 12 benchmark scenarios. |
| `frontend/components/Navbar.tsx` | Frontend UI | Shell | English branding, navigation links, and system status indicator. |
| `frontend/pages/_app.tsx` | Frontend Shell | Shell | Document `<title>` and `<meta name="description">` in English. |
| `frontend/pages/index.tsx` | Frontend UI | Public | Compelling English hero banner, value props, and technical methodology. |
| `frontend/pages/demo.tsx` | Frontend UI | Presentation | English demo sandbox instructions and benchmark scenario cards. |
| `frontend/components/DemoUpload.tsx` | Frontend UI | Presentation | English tabs, drag-and-drop, camera angle selector, and analysis CTA. |
| `frontend/components/ResultCard.tsx` | Frontend UI | Presentation | English AI depth badges, landmark chips, reasoning copy, and advisories. |
| `frontend/pages/dashboard.tsx` | Frontend UI | Operations | English operator stats, hotspot lists, and command layout. |
| `frontend/components/FloodMap.tsx` | Frontend UI | Operations | English vector map banner, depth scale legends (0 to 5), and popups. |
| `frontend/components/ZoneDetailPanel.tsx` | Frontend UI | Operations | English vehicle passability matrix and camera status telemetry. |
| `frontend/components/AlertSidebar.tsx` | Frontend UI | Operations | English critical red alert cards and empty state notifications. |
| `frontend/components/OverrideDialog.tsx` | Frontend UI | Operations | English override modal inputs, duration options, and action buttons. |

## 3. Data Models & Interface Contracts
- **Inference Payload**:
  - `reasoning`: English paragraph explaining landmark objects (wheels, exhaust pipes, curbs) and water level contact.
  - `alert_message`: Actionable English emergency advisory.
- **Route Safety Payload**:
  - `detour_advice`: Actionable English guidance for motorcycles vs. cars.
  - `flooded_segments[].depth_cm_range`: e.g. `"30-38cm"`.
- **Zone Status Payload**:
  - `name`: English localized street name.
  - `active_alerts`: `string[]` containing English alerts.

## 4. State Transitions & UI Behavior
- **Depth Scale State Machine**:
  - `Level 0`: Dry pavement (0cm) → Green badge → Passable for all vehicles.
  - `Level 1`: Minor pooling (5–15cm) → Cyan badge → Safe for all vehicles.
  - `Level 2`: Moderate flood (15–30cm) → Yellow badge → Caution for motorcycles.
  - `Level 3`: Critical danger (30–45cm) → Orange badge → Impassable for 2-wheelers (exhaust submerged).
  - `Level 4`: Severe flood (45–70cm) → Red badge → Impassable for sedans, high clearance required.
  - `Level 5`: Catastrophic (>70cm) → Purple badge → Road closed / completely impassable.

## 5. Security & Privacy Safeguards
- **Zero PII Leakage**: `PrivacyFilter` automatically blurs license plates and faces prior to transmission to Gemini API.
- **Rate Limiting**: Public endpoints enforce 120 requests/minute per client IP via token-bucket middleware.
- **Strict Input Validation**: Pydantic v2 validates all multipart image uploads and coordinates.

## 6. Test Design & Verification Strategy
- **Backend Unit Tests**: Verify prompt construction, response parsing, deduplication guard, route scoring logic, and weather client.
- **Frontend Verification**: TypeScript typecheck and `next build` static check.
- **Visual & String Audit**: Automated regex check ensuring 0 occurrences of Vietnamese characters in user-facing JSX and API response templates.

## 7. Rollout Plan (Transition to Construction)
- Upon finalizing this baseline, the project transitions to the **Construction Phase** across the 4 planned phases (UOW-LOC-001 through UOW-LOC-011).
- Execution proceeds autonomously with git checkpoints per phase.

## 8. Requirements Traceability Matrix (RTM)
| Requirement | Addressed In UOW | Verification Method |
|---|---|---|
| FR-LOC-01 (Landing Page) | UOW-LOC-006, UOW-LOC-007 | Visual verification of `/` in browser |
| FR-LOC-02 (Demo Sandbox) | UOW-LOC-001, UOW-LOC-005 | Interactive test of `/demo` with preset & upload |
| FR-LOC-03 (Operator Dashboard) | UOW-LOC-008, UOW-LOC-009, UOW-LOC-010 | Interactive test of `/dashboard`, map, and panels |
| FR-LOC-04 (Benchmark Dataset) | UOW-LOC-004 | Inspection of `benchmarkDataset.ts` |
| FR-LOC-05 (Gemini Prompt) | UOW-LOC-001 | Test `VLRDRPromptBuilder` output & mock reasoning |
| FR-LOC-06 (Backend Services) | UOW-LOC-002, UOW-LOC-003 | Unit tests & seed data verification |
| NFR-LOC-01 through 04 | UOW-LOC-011 | Zero-regex check & clean Next.js build |
