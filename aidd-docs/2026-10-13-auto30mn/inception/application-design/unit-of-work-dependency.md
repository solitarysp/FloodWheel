# Unit of Work Dependency — Automated 30-Minute AI Analysis & Admin Monitor

```mermaid
graph TD
    UOW1["UOW-SCAN-001: Background Worker Self-Healing Lifecycle"] --> UOW2["UOW-SCAN-002: Latency Reduction & Fair Rotating Discovery"]
    UOW1 --> UOW3["UOW-SCAN-003: Admin Portal Live Scanning Telemetry"]
    UOW2 --> UOW3
    UOW2 --> UOW4["UOW-SCAN-004: End-to-End Validation & Verification"]
    UOW3 --> UOW4
```

## Execution Order
1. **`UOW-SCAN-001`**: Establish rock-solid worker lifecycle, auto-start on trigger, and exception recovery in the backend.
2. **`UOW-SCAN-002`**: Eliminate redundant delays, add fair rotating discovery, and optimize HTTP timeouts.
3. **`UOW-SCAN-003`**: Build rich live monitor, countdown timer, progress bar, and controls on `/admin`.
4. **`UOW-SCAN-004`**: Verify end-to-end execution, measure cycle duration, and ensure zero regressions.
