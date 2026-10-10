# FloodWheel — Unit of Work Story Map

## Traceability Matrix

| User Story | Title | Addressed By Units of Work | Verification Target |
|---|---|---|---|
| **US-LOC-001** | Discover FloodWheel Capabilities on Landing Page | `UOW-LOC-006`, `UOW-LOC-007` | Landing page (`/`) renders English hero, value props, and nav links |
| **US-LOC-002** | Test Gemini Vision Depth Estimation in Demo Playground | `UOW-LOC-001`, `UOW-LOC-004`, `UOW-LOC-005` | Demo playground (`/demo`) with 12 English benchmarks and English VLRDR output |
| **US-LOC-003** | Monitor Live Municipal Flood Heatmap & Telemetry | `UOW-LOC-003`, `UOW-LOC-008`, `UOW-LOC-009` | Heatmap (`/dashboard`) shows English legend and zone passability telemetry |
| **US-LOC-004** | Emergency Red Alert Notification Stream | `UOW-LOC-002`, `UOW-LOC-010` | Red Alert ticker broadcasts English warning strings with zero empty errors |
| **US-LOC-005** | Query Route Safety & Navigation Detour API | `UOW-LOC-002` | `POST /api/v1/route/safety` returns English safety score and detour guidance |
| **US-LOC-006** | Manual Depth Override by Operator | `UOW-LOC-010` | Operator override dialog renders all inputs and buttons in English |
| **All Stories** | End-to-End System Integrity | `UOW-LOC-011` | Automated test suites pass; production build succeeds |
