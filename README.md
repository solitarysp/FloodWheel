# 🌊 ZeroFlood — Intelligent Urban Flood Resilience

<div align="center">

![ZeroFlood Logo](file:///Users/le.van.thanh/.gemini/antigravity-cli/brain/c94525fd-6829-4ac4-a892-6999dc33bb32/zeroflood_logo_png_1791614981478.jpg)

**"Zero Flooded Streets. Zero Blind Spots. Zero Hardware Cost."**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Gemini%20Vision%20VLRDR-00f2fe)](https://ai.google.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-009688)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20%7C%20Tailwind-black)](https://nextjs.org/)

</div>

---

## 👥 About Team ZeroFlood

**Team ZeroFlood** is an innovative engineering squad competing to solve catastrophic urban flooding challenges across megacities (e.g., Hanoi, Ho Chi Minh City, Manila, Jakarta) through state-of-the-art applied Artificial Intelligence.

### 🎯 The "ZeroFlood" Philosophy
- **ZERO Damage:** Eliminating vehicle engine stalls and human casualties caused by unexpected flood depths.
- **ZERO Blind Spots:** Unifying municipal surveillance feeds into an all-seeing real-time flood intelligence grid.
- **ZERO Extra Hardware:** 100% software-driven innovation utilizing existing public CCTV infrastructure without spending millions on subterranean hydraulic gauges.

---

## 💡 Competition Project: FloodWheel

**FloodWheel** is a breakthrough AI-powered flood depth sensing system powered by **Google Gemini Multimodal Vision** with our proprietary **Visual Landmark-Referenced Depth Ratio (VLRDR)** reasoning engine:

1. **Turn Every Traffic Camera into a Depth Gauge:** Estimates precise water depth in centimeters by referencing natural urban landmarks (motorcycle wheel diameter ~50cm, exhaust pipes ~35cm, sidewalk curbs).
2. **Real-time Vehicle Hazard Classification:** Classifies road conditions into 4 actionable threat tiers to alert drivers before engines submerge.
3. **Live Vector Heatmaps & Smart Detour Routing:** Aggregates feeds across 50–100+ municipal cameras into a real-time hazard heatmap, helping dispatch emergency pumps and guide fleets away from submerged corridors.

---

## 🏆 Core Values

* **Social Impact First:** Protecting millions of daily commuters and freight logistics from avoidable flood hazards.
* **Frugal Innovation:** Delivering enterprise-grade urban telemetry through multimodal computer vision rather than expensive, debris-clogged ground hardware.
* **Sub-Second Precision:** Sub-500ms inference pipeline providing live situational awareness for city crisis command centers.

---

## 🛠️ Technology Stack

* **AI & Vision:** Google Gemini Multimodal Vision, VLRDR Depth Reasoning Engine.
* **Core Backend:** Python 3.12+, FastAPI (:8000), SQLAlchemy, PostGIS / TimescaleDB.
* **Camera Management Microservice:** Dedicated FastAPI service (:8001) in `camera-backend/` managing ~800 public traffic surveillance cameras from Ho Chi Minh City (`giaothong.hochiminhcity.gov.vn`), featuring automatic `.VDMS` session cookie renewal, AjaxPro stack parsing, and Redis snapshot caching.
* **Shared Cache:** Redis 7 Alpine (snapshot cache, session tokens, rate limiting).
* **Frontend:** Next.js 14, React, Tailwind CSS, Leaflet/MapLibre GIS.
* **DevOps:** Docker, Docker Compose, automated multi-service orchestration.


---

## 📞 Team Contact
- **Team Name:** ZeroFlood (`zeroflood`)
- **Project:** FloodWheel — Real-time Urban Flood Depth Intelligence
