# Stage 3: Requirements Analysis — Verification Questions

## Question 1: Camera Snapshot Proxy Strategy
How should public CCTV camera streams be loaded on the client side given cross-origin restrictions (CORS) and external certificate variations?

A) Direct client browser `<img>` rendering using raw public URL  
B) **[Auto-Selected] Backend Asynchronous Proxy (`/api/v1/cameras/{id}/snapshot`) with 5-second in-memory caching and CORS headers**  
C) Client-side Web Worker with Canvas proxying  
X) Other  

[Answer]: B
*Rationale*: Public government traffic cameras (such as `giaothong.hochiminhcity.gov.vn`) frequently block cross-origin requests, hotlinking, or lack open CORS headers. Routing snapshot requests through the FastAPI backend proxy (`httpx.AsyncClient`) guarantees reliable rendering, masks network failures with graceful status tags, and provides controlled caching to minimize external bandwidth.

---

## Question 2: Instant Snapshot Analysis Trigger Flow
When an operator clicks the "Capture & Analyze" button, how should the image frame be acquired and processed?

A) The browser captures its local `HTMLImageElement` via Canvas and uploads the raw blob to `/analyze`  
B) **[Auto-Selected] The backend fetches the latest frame directly from `stream_url` upon receiving `POST /cameras/{id}/analyze`, feeds it to Gemini Vision, and updates the database record**  
C) Periodic background cron jobs analyze frames every 60 seconds regardless of user click  
X) Other  

[Answer]: B
*Rationale*: Backend-driven frame acquisition guarantees that Gemini Vision analyzes the full original resolution of the camera stream without browser canvas downscaling or lossy client-side re-compression. Furthermore, the backend can immediately persist the `FloodReadingDB` record, update the associated `FloodZone` depth level, and return the structured response in a single atomic transaction.

---

## Question 3: Real-Time Stream Auto-Refresh Options
What refresh mechanisms should be provided for live viewing in the Live Cameras directory?

A) Static snapshots only, updated exclusively on manual page reload  
B) Fixed 5-second automatic refresh for all cameras simultaneously  
C) **[Auto-Selected] User-configurable auto-refresh (Off / 10s / 30s / 60s) with individual camera manual refresh buttons and debouncing**  
X) Other  

[Answer]: C
*Rationale*: Allowing users to configure the refresh frequency prevents unnecessary bandwidth consumption when monitoring multiple camera feeds while providing traffic operators with near real-time visual updates during flood incidents.

---

## Question 4: Custom Public Camera Registration
What metadata and validation should be required when users register a new public camera?

A) Stream URL only without geographic or camera angle context  
B) **[Auto-Selected] ID, Name, Location text, GPS Latitude/Longitude, Camera Angle (street_level / elevated / overhead), Stream URL, and Zone association with connection validation**  
C) Admin-only CSV file import requiring server restart  
X) Other  

[Answer]: B
*Rationale*: The VLRDR algorithm relies heavily on `camera_angle` (to account for perspective distortion) and `location_hint`. Capturing full metadata ensures accurate AI water depth estimation, proper map marker placement, and seamless aggregation into the municipal heatmap.
