# Stage 7 — Units Generation: Unit of Work Dependencies

```mermaid
graph TD
    UOW1["UOW-CAM-001<br/>Scaffolding & Docker Compose"]
    UOW2["UOW-CAM-002<br/>Async HCMC Provider & Parser"]
    UOW3["UOW-CAM-003<br/>Redis Cache Service"]
    UOW4["UOW-CAM-004<br/>Catalog Service & Worker"]
    UOW5["UOW-CAM-005<br/>REST Endpoints (:8001)"]
    UOW6["UOW-CAM-006<br/>Core Backend Adapter (:8000)"]
    UOW7["UOW-CAM-007<br/>Integration Tests & E2E Validation"]

    UOW1 --> UOW2
    UOW1 --> UOW3
    UOW2 --> UOW4
    UOW3 --> UOW4
    UOW4 --> UOW5
    UOW5 --> UOW6
    UOW6 --> UOW7
```

## Dependency Matrix

| Unit of Work | Depends On | Blocks | Rationale |
|---|---|---|---|
| `UOW-CAM-001` | None | `UOW-CAM-002`, `UOW-CAM-003` | Base project environment and dependencies must exist first. |
| `UOW-CAM-002` | `UOW-CAM-001` | `UOW-CAM-004` | Parser and provider supply raw data models. |
| `UOW-CAM-003` | `UOW-CAM-001` | `UOW-CAM-004` | Caching service required for storing tokens and snapshots. |
| `UOW-CAM-004` | `UOW-CAM-002`, `UOW-CAM-003` | `UOW-CAM-005` | Catalog coordinates provider and cache for query serving. |
| `UOW-CAM-005` | `UOW-CAM-004` | `UOW-CAM-006` | REST controllers expose the catalog to upstream callers. |
| `UOW-CAM-006` | `UOW-CAM-005` | `UOW-CAM-007` | Upstream backend consumes the exposed API. |
| `UOW-CAM-007` | `UOW-CAM-006` | None | Complete end-to-end integration and verification suite. |
