# FloodWheel — User Personas (English Localization)

## Persona 1: Sarah Jenkins — International Hackathon Judge & Tech Evaluator
- **Role**: Senior Solutions Architect & AI Judge at Global Tech Hackathon / Smart Cities Challenge.
- **Background**: Native English speaker with deep expertise in computer vision, multimodal LLMs, and cloud systems. Does not speak Vietnamese.
- **Goals**:
  - Evaluate FloodWheel's technical architecture, Gemini 3.8 Flash integration, and innovation within a 3-minute demo window.
  - Understand the Visual Landmark Relative Depth Reasoning (VLRDR) methodology without language barriers.
  - Test custom uploaded images and preset benchmark scenarios to inspect prompt reasoning, confidence scores, and centimeter accuracy.
- **Pain Points**:
  - Inability to read Vietnamese UI text, AI reasoning outputs, or button labels.
  - Confusion when alert messages or detour warnings contain non-English characters or untranslated domain jargon.

## Persona 2: Minh Tran — Municipal Traffic Operations Center Supervisor
- **Role**: Operations Lead at Ho Chi Minh City Integrated Urban Monitoring Center.
- **Background**: Bilingual Vietnamese/English civil engineer overseeing public CCTV networks, traffic signal coordination, and flood response.
- **Goals**:
  - Monitor city-wide flood heatmaps in real-time across 50–100 public CCTV cameras.
  - Present telemetry and live incident metrics to international civic partners (World Bank, JICA, UN-Habitat).
  - Rapidly spot critical red alerts (Level ≥ 3) where water exceeds 30 cm and trigger automated broadcast warnings.
- **Pain Points**:
  - Difficulty demoing the system to international donors and international engineering partners when the interface is exclusively Vietnamese.
  - Needs standardized, unambiguous English metrics and vehicle passability ratings.

## Persona 3: Alex Rivera — Regional Fleet Operations Director (Ride-Hailing & Courier)
- **Role**: Fleet Routing & Driver Safety Manager for Southeast Asia Delivery Networks.
- **Background**: Manages logistics for 50,000+ motorcycle couriers across HCMC, Hanoi, and Manila. English-language corporate workflow.
- **Goals**:
  - Integrate FloodWheel's `/api/v1/route/safety` endpoint into courier dispatch algorithms.
  - Receive automated webhook payloads in English when key thoroughfares flood past motorcycle exhaust level (~35 cm).
  - Keep couriers safe from engine hydrolock and vehicle damage while minimizing delivery delays.
- **Pain Points**:
  - Legacy webhook payloads with mixed Vietnamese descriptions break automated international parsing pipelines.

## Persona 4: Elena Rossi — Climate Resilience & Urban Hydrology Specialist
- **Role**: International Disaster Management Advisor.
- **Background**: Uses sensorless vision data to model urban catchment inundation and validate satellite flood maps.
- **Goals**:
  - Export GeoJSON heatmaps and inspect historical CCTV readings across flood zones.
  - Verify landmark calibration tables against international automotive specifications.
- **Pain Points**:
  - Inability to interpret localized terminology for road sections and visual landmarks.
