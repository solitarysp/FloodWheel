# Stage 7: Units Generation — Dependency & Execution DAG

## Execution Sequence & Dependency Graph

```mermaid
graph TD
    UOW01["UOW-CAM-001: Stream Proxy & Frame Ingestion"]
    UOW02["UOW-CAM-002: Snapshot VLRDR Analysis Endpoint"]
    UOW03["UOW-CAM-003: Camera Registration & Stream Validation"]
    UOW04["UOW-CAM-004: Live Cameras Directory & Navigation"]
    UOW05["UOW-CAM-005: Camera Card & Auto-Refresh Controls"]
    UOW06["UOW-CAM-006: Capture & Analysis Modal"]
    UOW07["UOW-CAM-007: Integration Tests & Full-Stack Verification"]

    UOW01 --> UOW02
    UOW01 --> UOW03
    UOW01 --> UOW05
    UOW02 --> UOW06
    UOW04 --> UOW05
    UOW05 --> UOW06
    UOW03 --> UOW07
    UOW06 --> UOW07
```

## Batch Rollout Plan
- **Batch 1 (Backend Core)**: `UOW-CAM-001` (Proxy Service) → `UOW-CAM-002` (Analyze Endpoint) → `UOW-CAM-003` (Registration API).
- **Batch 2 (Frontend Interface)**: `UOW-CAM-004` (Directory & Nav) → `UOW-CAM-005` (Camera Card & Viewer) → `UOW-CAM-006` (Analysis Modal).
- **Batch 3 (Verification)**: `UOW-CAM-007` (Automated Tests & System Verification).
