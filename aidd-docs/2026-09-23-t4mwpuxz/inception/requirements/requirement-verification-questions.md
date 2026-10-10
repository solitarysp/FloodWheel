# FloodWheel — Requirement Verification Questions

These questions are recorded to clarify ambiguous requirements before SRS finalization.
Please fill in the `[Answer]:` section for each question.

---

## Question 1
**What is the primary deployment context for the initial launch?**

A) Hackathon demo only (3-minute presentation, static images, no live infrastructure)
B) Hackathon demo + immediately deployable pilot for one city (e.g., HCMC)
C) Full production system from day 1, targeting multiple cities simultaneously
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B) Hackathon demo + immediately deployable pilot for one city (e.g., HCMC). Follows the 3-phase execution plan: Phase 1 completes the 3-minute hackathon demo (UOW-001 to UOW-007), transitioning directly into the Phase 2 real-world pilot in HCMC.

---

## Question 2
**Which Gemini model should be used for production frame analysis?**

A) Gemini 1.5 Flash only (low cost, fast, good enough for classification)
B) Gemini 1.5 Pro for ambiguous frames, Flash for clear ones (hybrid)
C) Gemini 2.0 Flash (latest, potentially better vision)
X) Other (write your explanation after the [Answer]: tag)

[Answer]: C) Gemini 2.0 Flash (with configurable fallback to Gemini 1.5 Flash via environment variable `GEMINI_MODEL`). Provides superior spatial reasoning, sub-second latency (~500ms), and native structured JSON output at minimal cost.

---

## Question 3
**How will traffic camera feeds be accessed?**

A) City government open API / existing integration agreements
B) Public CCTV streams already available online (e.g., city portals)
C) Simulated/pre-recorded video feeds for demo; real integration deferred
D) Partnership with telecom/ISP that manages camera infrastructure
X) Other (write your explanation after the [Answer]: tag)

[Answer]: X) Phased approach: C for Phase 1 Demo (simulated & pre-recorded video feeds/snapshots like Nguyen Huu Canh, Vo Van Ngan to ensure 100% demo reliability without external downtime), expanding to B for Phase 2 Pilot (connecting to public city CCTV web feeds e.g. giaothong.hochiminhcity.gov.vn).

---

## Question 4
**What is the target frontend interface?**

A) Web dashboard only (for operators/emergency services)
B) Public-facing web map (like Google Maps with flood overlay)
C) Both: operator dashboard + public map
D) API-only (no frontend, consumed by partners like Grab)
X) Other (write your explanation after the [Answer]: tag)

[Answer]: C) Both: operator dashboard + public map. Implemented via Next.js: public responsive heatmap view for commuters/drivers, plus an authenticated administrative control panel for municipal flood monitoring operators.

---

## Question 5
**What is the backend technology preference?**

A) Python (FastAPI/Flask) — best Gemini SDK support, ML-friendly
B) Node.js (TypeScript) — good for real-time streaming
C) Go — high performance for many concurrent camera streams
X) Other (write your explanation after the [Answer]: tag)

[Answer]: A) Python (FastAPI). First-class support for Google GenAI SDK, Pydantic data validation, async REST/WebSocket streaming, and seamless integration with OpenCV/image processing libraries.

---

## Question 6
**What mapping library/service should be used for the heatmap?**

A) Google Maps JavaScript API (familiar, good integration)
B) Mapbox GL JS (powerful styling, vector tiles)
C) Leaflet.js with OpenStreetMap (open source, free)
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B) Mapbox GL JS. High-performance WebGL vector tiles, native GeoJSON heatmap rendering, customizable dark/rain weather layers, and smooth camera animations.

---

## Question 7
**Should the system include a mobile-optimized Progressive Web App (PWA)?**

A) Yes — commuters need mobile access to flood maps
B) No — focus on web dashboard for operators first, mobile deferred
C) Yes — but only read-only map access, no operator features
X) Other (write your explanation after the [Answer]: tag)

[Answer]: C) Yes — but only read-only map access, no operator features. Optimizes mobile view for commuters and delivery drivers (Grab/ShopeeFood) with GPS location and route alerts, while keeping heavy operator controls on desktop.

---

## Question 8
**What cloud infrastructure is preferred for deployment?**

A) Google Cloud Platform (aligns with Gemini API, Firebase, Maps)
B) AWS (widely used, strong infrastructure)
C) On-premise / city government servers (data sovereignty requirement)
D) Any cloud — containerized (Docker/Kubernetes), infrastructure-agnostic
X) Other (write your explanation after the [Answer]: tag)

[Answer]: D) Any cloud — containerized (Docker Compose for local development/demo, Kubernetes/GCP Cloud Run ready), ensuring infrastructure-agnostic deployment while keeping GCP as the recommended primary cloud.

---
