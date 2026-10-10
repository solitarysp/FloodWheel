# FloodWheel — Code Quality Assessment

## 1. Current State Evaluation
- **Strengths**:
  - Clear separation of concerns with `BaseCameraProvider` interface and `HCMCCameraProvider`.
  - Proper asynchronous concurrency with `asyncio.Lock` for session renewal.
  - Resilience against malformed JavaScript with customized AjaxPro parsing.
- **Weaknesses & Vulnerabilities**:
  1. **Absence of Content Verification**: Upstream responses are accepted as long as status code is 200 and length > 50 bytes. The 5,192-byte error placeholder bypasses this completely and pollutes the Redis cache.
  2. **Absence of Long-Term Persistence**: Snapshots exist only ephemerally in Redis (TTL 10s). If the municipal camera drops out after the TTL expires, the user gets either a broken placeholder or a generic synthetic frame, losing the physical visual history.
  3. **No Fallback Priority**: Direct failure jumps straight to mock frame generation instead of checking whether a real valid frame was previously captured.

## 2. Refactoring Targets
- Introduce `ImageValidator` with deterministic multi-factor rules.
- Introduce `SnapshotStorageService` with non-blocking async disk writes and reads.
- Update `CatalogService` and `HCMCCameraProvider` workflow to guarantee that no error placeholder ever reaches user eyes or disk storage.
