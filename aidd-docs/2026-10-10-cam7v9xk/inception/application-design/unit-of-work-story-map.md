# Stage 7: Units Generation — Traceability Story Map

## Traceability from User Stories to Units of Work

| User Story | Units of Work | Deliverables | Verification Strategy |
|---|---|---|---|
| **US-CAM-001** (Live Camera Directory & Filters) | **UOW-CAM-004** | `pages/cameras.tsx`, `components/Navbar.tsx` | Visual verification of camera directory, filter chips, and navigation link. |
| **US-CAM-002** (Snapshot Streaming & Auto-Refresh) | **UOW-CAM-001**, **UOW-CAM-005** | `camera_stream_service.py`, `GET /cameras/{id}/snapshot`, `CameraCard.tsx` | Snapshot frame proxy delivery, 5-second caching, auto-refresh interval behavior. |
| **US-CAM-003** (Capture & Analyze Button + Modal) | **UOW-CAM-002**, **UOW-CAM-006** | `POST /cameras/{id}/analyze`, `CameraAnalysisModal.tsx` | Click button, verify Gemini VLRDR analysis, verify depth range, passability, reasoning display. |
| **US-CAM-004** (Register Custom Camera Stream) | **UOW-CAM-003**, **UOW-CAM-004** | `POST /cameras`, `AddCameraModal.tsx` | Form submission, URL validation, database persistence, immediate appearance in grid. |
