# Stage 3 — Requirements Verification Questions

The following questions cover critical technical, architectural, and operational requirements for the new `camera-backend` microservice and its integration with FloodWheel's core backend. Under **Autonomous Mode (Auto-Approve & Auto-Resolve)**, each question has been systematically analyzed and resolved with the optimal engineering rationale.

---

## Question 1: Camera Catalog Synchronization Cadence & Storage Strategy

How should the ~800 traffic cameras from Ho Chi Minh City (`giaothong.hochiminhcity.gov.vn`) be synchronized and persisted within `camera-backend`?

A) Pure On-Demand: No local database; every list or search request queries government servers directly in real time.  
B) (Selected) Hybrid Persistent Catalog with Scheduled Background Sync: Persist camera metadata into a dedicated SQLite or PostgreSQL database in `camera-backend`, sync in background upon startup and every 6 hours (configurable via CRON/interval), and serve list/search queries locally with sub-5ms latency.  
C) Redis-Only Cache: Store all camera objects solely in Redis memory keys without relational persistence.  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Government servers can be slow (1.5 - 3.5 seconds for AjaxPro queries) and may experience intermittent outages or rate-limiting. Storing the metadata in a local relational database with background sync ensures instant query performance (<5ms) for the frontend and backend, while isolating FloodWheel from government server downtime.

---

## Question 2: Session Cookie Lifecycle & Re-Authentication Resilience

The HCMC traffic portal requires session cookies (`.VDMS`, `ASP.NET_SessionId`, etc.) for both catalog queries and snapshot rendering (`:8007`). How should cookie authentication and expiration be managed?

A) One-off Fetch on Startup: Fetch cookies once on service start and retain them forever in memory.  
B) (Selected) Automatic Proactive Refresh & Reactive Circuit Breaker: Maintain active session cookies in Redis with a 15-minute proactive renewal timer; if any snapshot or API call receives HTTP 401/403 or "User is not authenticated", automatically invalidate cookies, trigger an async re-authentication lock, retry the request once, and record health telemetry.  
C) Per-Request Authentication: Fetch fresh cookies from `/map.aspx` on every single snapshot request.  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Per-request authentication creates excessive overhead and risk of IP ban by the municipal portal. A proactive 15-minute background refresh paired with reactive re-authentication on 401/403 guarantees continuous zero-downtime operation even if the government server forcibly expires sessions early.

---

## Question 3: Snapshot Caching & High-Concurrency Protection

When multiple users or automated AI monitoring jobs request snapshot images for the same camera concurrently, how should caching and traffic be managed?

A) Direct Passthrough: Always query port 8007 for every snapshot request without caching.  
B) (Selected) Short-TTL Distributed Caching with Single-Flight Throttling: Cache snapshot JPEG bytes in Redis with a 5 to 15-second TTL; simultaneous requests for the same camera ID within the cache window are served directly from Redis, preventing duplicate external requests.  
C) Long-term Image Disk Storage: Save every snapshot image permanently to disk storage.  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Camera feeds typically refresh every 10 to 30 seconds at the traffic control center. A 5-15s TTL provides real-time freshness while reducing upstream load by over 95% during concurrent usage, preventing FloodWheel from overloading municipal endpoints.

---

## Question 4: Upstream Core Backend Integration Contract

How should the existing FloodWheel main backend (`:8000`) integrate with the new `camera-backend` (`:8001`)?

A) Direct Database Sharing: Main backend directly accesses the internal database of `camera-backend`.  
B) (Selected) HTTP REST Client Adapter with Circuit Breaker (`CameraServiceClient`): Main backend communicates over the Docker bridge network (`http://camera-backend:8001`) via async HTTPX with connection pooling, retries, and fallback to synthetic CCTV frames if the microservice is unreachable.  
C) Message Queue Broker (Kafka / RabbitMQ): Decouple all camera requests through an asynchronous message broker.  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Microservice decoupling requires strict API boundaries rather than shared database coupling. An async HTTP client adapter with fallback resilience ensures clean separation of concerns, easy mockability for testing, and zero coupling to `camera-backend`'s internal persistence schema.
