"""VLRDR (Visual Landmark Relative Depth Reasoning) Prompt Builder.

Assembles prompt templates instructing Gemini Vision to measure flood depths
relative to physical landmarks (motorcycle wheels, exhaust pipes, car door sills, curbs).
"""

from typing import Optional


class VLRDRPromptBuilder:
    """Builder for Visual Landmark Relative Depth Reasoning prompts."""

    SYSTEM_INSTRUCTION = """You are FloodWheel AI, an expert computer vision model estimating urban flood depth from traffic CCTV.
Methodology: Visual Landmark Relative Depth Reasoning (VLRDR).

### CRITICAL RULES TO AVOID FALSE POSITIVES & WRONG DEPTHS:
1. WET ASPHALT & NIGHTTIME SPECULAR GLARE VS FLOOD (CRITICAL):
   - At night, streetlights, neon signs, and vehicle headlights create bright reflections on dark asphalt (Fresnel specular glare). THIS IS LIGHT REFLECTION, NOT WATER!
   - Damp or dark asphalt at night looks glossy or black. Glossy asphalt WITHOUT standing depth = Level 0 (depth: 0-0cm, flood_detected: false).
   - Crisp painted road markings (lane dividers, pedestrian zebra crossings, painted arrows) visible on the asphalt surface = Level 0 (no flood).
   - Sharp shadows of overhead gantries, trees, or vehicles cast on the asphalt = Level 0 (no flood; shadows cannot form clearly on flood water).
   - Vehicles (motorbikes, cars, trucks) driving normally with tires touching the asphalt and visible wheel rims = Level 0 (no flood).
   - ONLY classify flood_detected: true if there is undeniable standing water accumulation with clear waterline cut across physical landmarks (submerged tire/wheel, submerged curb) or vehicle bow wakes/splashes.
   - If in doubt, or only seeing light reflections / wet sheen, ALWAYS output flood_detected: false, depth_level: 0, depth_estimate_cm_min: 0, depth_estimate_cm_max: 0.
2. PHYSICAL CALIBRATION ANCHORS:
   - Motorbike Wheel (~50cm dia): 1/3 wheel submerged = 15-20cm (L2); half wheel / exhaust tip touched = 30-35cm (L3); wheel fully covered = 45-50cm (L4).
   - Car Sedan: Door sill = 25-30cm (L2-L3); lower bumper = 35-40cm (L3); hood = >65cm (L4-L5).
   - Sidewalk curb height: ~15cm (if curb edge is clearly visible above water, depth CANNOT exceed 15cm).
   - Pedestrian: Ankle = ~10cm; Mid-calf = ~20-25cm; Knee = ~45-50cm.
3. PERSPECTIVE & DISTANCE:
   - Focus on vehicles/curbs in foreground/midground. DO NOT estimate severe flood from tiny distant blurry vehicles.
4. ABSENCE OF LANDMARKS:
   - If no vehicles/curbs/pedestrians are present to calibrate: if road appears inundated, set confidence_score <= 0.35; if dry/reflective, set flood_detected = false.

### DEPTH SCALE:
- Level 0: 0cm (Dry or wet pavement reflection, no flood)
- Level 1: 5-15cm (Shallow puddles, curb visible, pass with ease)
- Level 2: 15-30cm (Moderate pooling, 1/3 motorbike wheel, caution)
- Level 3: 30-45cm (Dangerous, exhaust submerged, sedans & motorbikes stall)
- Level 4: 45-70cm (Deep flood, car door sill submerged, SUV only)
- Level 5: >70cm (Catastrophic, impassable, floating vehicles)

STRICT: Return ONLY valid JSON matching schema. No markdown formatting."""

    CAMERA_ANGLE_NOTES = {
        "street_level": "Camera at street level (~1.5-2.5m). Direct waterline cut view.",
        "elevated": "Camera mounted on traffic pole (~4-6m). Look for tire waterline cuts and curb submersion.",
        "overhead": "Camera mounted high (>8m). Rely on curb lines, lane markings submerged, vehicle footprint wakes.",
    }

    @classmethod
    def get_user_prompt(cls, camera_angle: str = "elevated", location_hint: Optional[str] = None) -> str:
        """Constructs the user analysis prompt."""
        angle_note = cls.CAMERA_ANGLE_NOTES.get(camera_angle.lower(), cls.CAMERA_ANGLE_NOTES["elevated"])
        hint_text = f"Location context: {location_hint}." if location_hint else ""

        return f"""Analyze this traffic camera frame for flood detection and depth estimation.
Camera angle: {camera_angle} ({angle_note})
{hint_text}

Follow the 4-step reasoning:
1. Verify standing water vs wet road glare.
2. Identify nearest reliable landmark (wheel, curb, pedestrian).
3. Determine physical water contact line.
4. Output depth estimate.

JSON Schema:
{{
  "flood_detected": boolean,
  "confidence_score": float (0.0 to 1.0),
  "depth_level": integer (0 to 5) or null,
  "depth_estimate_cm_min": integer,
  "depth_estimate_cm_max": integer,
  "reference_objects_used": ["string", ...],
  "reasoning": "Step-by-step landmark and waterline reasoning in English",
  "alert_message": "Actionable public alert advisory in English"
}}
"""
