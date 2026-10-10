# Stage 2 — Reverse Engineering: Code Quality Assessment

## 1. Resilience & Reliability Risks with External Government Endpoints
1. **Session Expiry & Cookie Invalidation**:
   - *Risk*: `giaothong.hochiminhcity.gov.vn` invalidates `.VDMS` and `ASP.NET_SessionId` periodically or under load.
   - *Mitigation*: Automated re-authentication on 401/403 or whenever "User is not authenticated" is detected in responses, with an exponential backoff circuit breaker.
2. **AjaxPro Serialization Peculiarities**:
   - *Risk*: The endpoint returns non-standard JavaScript `new Ajax.Web.DataTable(...)` rather than standard JSON. Standard `json.loads` will fail.
   - *Mitigation*: Robust stack-based parser ported from `hcmc_traffic_cameras.py` and wrapped in unit tests with fixtures of actual responses.
3. **Government Server Throttling & Network Timeouts**:
   - *Risk*: The portal or camera streaming port (8007) may be slow or temporarily unresponsive.
   - *Mitigation*: Strict HTTP timeouts (10s for snapshot, 30s for catalog sync) + Redis caching with 5-15s TTL so multiple users viewing the same camera don't trigger simultaneous upstream requests.
4. **Data Integrity & Coordinate Mapping**:
   - *Risk*: Some camera entries may have malformed `Shape` fields or empty coordinates.
   - *Mitigation*: Safe regex parsing for `POINT(lng lat)` with bounds validation (HCMC bounding box ~ 10.3° to 11.2° N, 106.3° to 107.1° E).
