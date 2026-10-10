# FloodWheel — Application Design: Services (English Localization)

## 1. Backend Service Redesign & Language Contract

### 1.1 `VLRDRPromptBuilder` (`backend/app/services/vlrdr_prompt.py`)
- **Responsibility**: Constructs system instructions and user analysis prompts for Gemini 3.8 Flash.
- **English Contract**:
  - `SYSTEM_INSTRUCTION`: Maintain comprehensive vehicle calibration table in English (Motorcycle ~50cm wheel, ~30-35cm exhaust; Sedan ~25-30cm door sill; Curbs ~15cm).
  - Explicit Output Constraint:
    ```
    "reasoning": "Clear description of visual landmarks detected and water contact points in English",
    "alert_message": "Actionable public alert message summarizing water depth and road passability in English"
    ```
  - This eliminates any bilingual ambiguity and guarantees uniform English JSON output.

### 1.2 `GeminiClient` (`backend/app/services/gemini_client.py`)
- **Responsibility**: Executes multimodal inference against Google GenAI API or produces deterministic mock data for offline/demo tests.
- **English Mock Contract**:
  ```python
  mock_json = """{
    "flood_detected": true,
    "confidence_score": 0.92,
    "depth_level": 3,
    "depth_estimate_cm_min": 30,
    "depth_estimate_cm_max": 38,
    "reference_objects_used": ["Honda Wave motorcycle rear wheel", "exhaust pipe", "sidewalk curb"],
    "reasoning": "Water level reaches half of the motorcycle wheel (~50cm) and submerges the exhaust pipe tip. The 15cm sidewalk curb is completely underwater.",
    "alert_message": "Flood depth 30-38cm! Motorcycle exhaust pipes are submerged. Two-wheelers and sedans are strongly advised to avoid this street."
  }"""
  ```

### 1.3 `ThresholdMonitor` (`backend/app/services/threshold_monitor.py`)
- **Responsibility**: Evaluates zone readings, enforces 15-minute alert cooldowns, and generates broadcast alerts when `depth_level >= 3`.
- **English Message Template**:
  ```python
  message = (
      f"CRITICAL FLOOD ALERT: {zone.name} is at Flood Level {level} "
      f"({new_status.depth_cm_min}-{new_status.depth_cm_max}cm). "
      f"Motorcycle exhaust pipes are submerged. Route impassable for two-wheelers!"
  )
  ```

### 1.4 `RouteScorer` (`backend/app/services/route_scorer.py`)
- **Responsibility**: Calculates spatial distance between route waypoints and flood polygons, determining safety score (0–100) and detour advisories.
- **English Advisory Templates**:
  - Safe condition: `"Route is clear. No severe flood zones detected along your path."`
  - Flooded condition:
    ```python
    detour_note = (
        f"WARNING: Route crosses Flood Level {worst_level} (water depth up to {max_depth_cm}cm). "
        f"High risk of vehicle engine hydrolock. Detour via higher elevation corridors strongly recommended."
    )
    ```

### 1.5 `ZoneAggregator` (`backend/app/services/zone_aggregator.py`)
- **Responsibility**: Computes rolling weighted average of camera readings per zone.
- **English Alert Tag**:
  ```python
  active_alerts=[f"Flood Alert: {final_min}-{final_max}cm"] if final_level >= 3 else []
  ```

### 1.6 `SeedData` (`backend/app/db/seed_data.py`)
- **Responsibility**: Bootstraps PostgreSQL database with sample zones and CCTV cameras.
- **English Localized Names**:
  - Zone 1: `"Nguyen Huu Canh Corridor (Thu Thiem Bridge - The Manor)"`, District: `"Binh Thanh"`
  - Zone 2: `"Vo Van Ngan Incline (Thu Duc Market)"`, District: `"Thu Duc City"`
  - Zone 3: `"Quoc Huong Street (Thao Dien)"`, District: `"Thu Duc City"`
  - Zone 4: `"Le Loi Boulevard - Ben Thanh Market"`, District: `"District 1"`
  - Cameras: Localized descriptions (e.g. `"CCTV 042: Nguyen Huu Canh Overpass"`, `"CCTV 043: Nguyen Huu Canh & Ngo Tat To Intersection"`).
