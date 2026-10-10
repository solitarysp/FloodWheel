# FloodWheel — Unit of Work Dependency Graph

```mermaid
graph TD
    U1[UOW-ERR-001: Image Validation Engine]
    U2[UOW-ERR-002: Snapshot Disk Storage Service]
    U3[UOW-ERR-003: Provider & Catalog Integration]

    U1 --> U3
    U2 --> U3
```

- **Execution Order**:
  1. `UOW-ERR-001` (can run independently or concurrently)
  2. `UOW-ERR-002` (can run independently or concurrently)
  3. `UOW-ERR-003` (depends on UOW-ERR-001 and UOW-ERR-002)
