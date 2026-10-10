# FloodWheel — Unit of Work Dependencies

## Dependency Graph
```mermaid
flowchart TD
    UOW-LOC-001["UOW-LOC-001: VLRDR Prompt & Gemini Mock"] --> UOW-LOC-002["UOW-LOC-002: Alerts & Routing Services"]
    UOW-LOC-001 --> UOW-LOC-005["UOW-LOC-005: Demo Playground & ResultCard"]
    UOW-LOC-003["UOW-LOC-003: Seed Data Geographies"] --> UOW-LOC-008["UOW-LOC-008: Real-Time Heatmap"]
    UOW-LOC-004["UOW-LOC-004: Benchmark Dataset"] --> UOW-LOC-005
    UOW-LOC-006["UOW-LOC-006: Navigation & Meta"] --> UOW-LOC-007["UOW-LOC-007: Landing Page Copy"]
    UOW-LOC-006 --> UOW-LOC-009["UOW-LOC-009: Dashboard & Zone Panel"]
    UOW-LOC-008 --> UOW-LOC-009
    UOW-LOC-002 --> UOW-LOC-010["UOW-LOC-010: Alert Sidebar & Override"]
    UOW-LOC-009 --> UOW-LOC-010
    UOW-LOC-005 --> UOW-LOC-011["UOW-LOC-011: Verification & Tests"]
    UOW-LOC-007 --> UOW-LOC-011
    UOW-LOC-010 --> UOW-LOC-011
```

## Execution Order
1. **Batch 1 (Backend Core & Prompts)**: `UOW-LOC-001`, `UOW-LOC-002`, `UOW-LOC-003`
2. **Batch 2 (Benchmark Data & Demo Sandbox)**: `UOW-LOC-004`, `UOW-LOC-005`
3. **Batch 3 (Frontend Shell & Marketing Pages)**: `UOW-LOC-006`, `UOW-LOC-007`
4. **Batch 4 (Operator Console & Alerts)**: `UOW-LOC-008`, `UOW-LOC-009`, `UOW-LOC-010`
5. **Batch 5 (Verification & Build Check)**: `UOW-LOC-011`
