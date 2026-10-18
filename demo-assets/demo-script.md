# FloodWheel — 3-Minute Demo Presentation Script (Hackathon / Stakeholder)

## Duration: 180 seconds (3 minutes)
## Objective: Demonstrate the breakthrough feasibility of VLRDR with Gemini Vision AI without requiring expensive dedicated flood sensors.

---

### Minute 1 (0:00 – 1:00): The Problem & Real-World Pain Points
- **Speaker:**
  > "Distinguished judges, in cities like Hanoi, Ho Chi Minh City, or Manila, heavy rainfall immediately translates into urban flooding.
  > Today, municipal authorities, millions of commuters, and logistics fleets alike are completely **blind** to exact flood water depths in centimeters.
  > Subterranean hydraulic flood sensors are costly, vulnerable to debris blockage, and notoriously expensive to maintain.
  > Yet our metropolitan areas already operate hundreds of municipal **traffic CCTV cameras** 24/7.
  > **FloodWheel** transforms every existing CCTV camera into a real-time water depth sensor with **zero new hardware expenditure**."

---

### Minute 2 (1:00 – 2:00): Live Demo Showcase
- **Action:**
  1. Open the Demo sandbox at `http://localhost:3000/demo`.
  2. Click **"Load Preset Sample"** or drag-and-drop the Nguyen Huu Canh street flood image into the upload frame.
  3. Click **"Analyze Water Depth (Gemini VLRDR)"**.
- **Speaker:**
  > "Observe closely: In under **0.5 seconds**, the Gemini Vision model detects the motorcycle wading through water.
  > Rather than rough guessing, the AI applies **VLRDR (Visual Landmark Relative Depth Reasoning)**:
  > - Standard motorcycle wheel diameter is approximately 50cm.
  > - Here, the water has risen over half the wheel, completely submerging the motorcycle exhaust pipe (~35cm).
  > - AI instantly concludes: **Depth 30–38cm (Level 3) — Critical stall hazard for two-wheeled vehicles!**"

---

### Minute 3 (2:00 – 3:00): Scalability & Social Impact
- **Speaker:**
  > "Beyond a single camera, FloodWheel autonomously aggregates telemetry across 50–100 municipal cameras into an active vector heatmap and early warning network in real time.
  > - **For Municipal Authorities:** Instant detection of critical bottlenecks to dispatch pumps, traffic police, and rescue squads proactively.
  > - **For Drivers & Commuters:** Real-time routing engine calculates safe detour scores around flooded corridors, safeguarding lives and vehicles.
  > **FloodWheel: Turning street cameras into intelligent eyes safeguarding smart cities.** Thank you!"
