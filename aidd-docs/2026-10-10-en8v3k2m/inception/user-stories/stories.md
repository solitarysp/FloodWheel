# FloodWheel — User Stories (English Localization)

## Story US-LOC-001: Discover FloodWheel Capabilities on Landing Page
- **As an** international hackathon judge or civic technology partner (Sarah),
- **I want to** explore the FloodWheel landing page in English,
- **So that** I can instantly understand the problem statement, the zero-sensor VLRDR innovation, and the societal impact of urban flood mapping.
- **Acceptance Criteria**:
  - **Given** I navigate to `/`,
  - **When** the page loads,
  - **Then** all headlines, subheaders, value propositions, architectural diagrams, statistics, and navigation links are displayed in idiomatic English with zero untranslated Vietnamese text.

---

## Story US-LOC-002: Test Gemini Vision Depth Estimation in Demo Playground
- **As an** evaluator testing AI vision capabilities (Sarah / Elena),
- **I want to** select preset street benchmarks or upload test photos with English controls,
- **So that** I can observe Gemini 3.8 Flash measuring flood depth against physical vehicle landmarks.
- **Acceptance Criteria**:
  - **Given** I am on the `/demo` playground,
  - **When** I view the benchmark scenario selector,
  - **Then** all 12 benchmark cards display English titles (e.g. "Car Traversing Deep Floodwater in Downtown Corridor", "Dry Street with Crisp Lane Markings"), English locations, and identified landmarks.
  - **When** I click "Analyze Flood Depth (Gemini VLRDR)",
  - **Then** the inference result displays English depth level badges, English landmark bullet points, English AI reasoning, and English public advisories.

---

## Story US-LOC-003: Monitor Live Municipal Flood Heatmap & Telemetry
- **As a** municipal operations supervisor (Minh),
- **I want to** inspect the real-time city map and zone telemetry in English,
- **So that** I can brief international civil protection partners and emergency response coordinators.
- **Acceptance Criteria**:
  - **Given** I open `/dashboard`,
  - **When** the interactive map renders,
  - **Then** the map title displays "Real-time Urban Flood Map — Ho Chi Minh City", the depth scale legend is labeled in English ("Level 0: Dry" through "Level 5: Catastrophic >70cm"), and clicking any flood polygon opens an English `ZoneDetailPanel`.
  - **And** the `ZoneDetailPanel` presents vehicle passability matrix clearly: "Motorcycle: Impassable", "Sedan: High Risk", "High Clearance SUV: Caution".

---

## Story US-LOC-004: Emergency Red Alert Notification Stream
- **As an** emergency dispatcher or fleet logistics manager (Alex / Minh),
- **I want to** receive real-time Red Alert notices in English when water levels exceed Level 3,
- **So that** I can alert drivers and deploy road closure barriers immediately.
- **Acceptance Criteria**:
  - **Given** an active flood zone has `depth_level >= 3` (water over 30 cm),
  - **When** I inspect the `AlertSidebar` on `/dashboard`,
  - **Then** the alert card presents clear English text: "CRITICAL FLOOD ALERT: Nguyen Huu Canh Corridor is at Level 3 (30-38cm). Motorcycle exhaust pipes submerged. Avoid this route!"
  - **And** if no zones exceed the critical threshold, an English empty state is shown: "No active flood emergencies in the metropolitan area."

---

## Story US-LOC-005: Query Route Safety & Navigation Detour API
- **As a** fleet routing engineer (Alex),
- **I want to** submit delivery waypoint coordinates to `POST /api/v1/route/safety` and receive English detour guidance,
- **So that** my dispatch service can provide immediate English routing instructions to couriers and automated apps.
- **Acceptance Criteria**:
  - **Given** a courier route passes through a flooded zone,
  - **When** the client posts waypoints to `/api/v1/route/safety`,
  - **Then** the JSON response contains `detour_advice` in English (e.g. "WARNING: Route crosses Flood Level 3 (up to 38cm). Motorcycle engines are at high risk of water damage. Detour via higher elevation corridors recommended.") and an accurate safety score from 0 to 100.

---

## Story US-LOC-006: Manual Depth Override by Operator
- **As a** city traffic operator (Minh),
- **I want to** manually override a zone's flood level using an English dialog modal,
- **So that** I can apply on-the-ground field reports even if a camera is occluded.
- **Acceptance Criteria**:
  - **Given** an operator opens the override modal on `/dashboard`,
  - **When** the dialog renders,
  - **Then** all form labels ("Override Flood Level (0 - 5)", "Min Depth (cm)", "Max Depth (cm)", "Validity Duration (Hours)", "Operator Justification") and buttons ("Apply Override", "Cancel") are presented in clean English.
