"""VLRDR (Visual Landmark Relative Depth Reasoning) Prompt Builder.

Assembles prompt templates instructing Gemini Vision to measure flood depths
relative to physical landmarks (motorcycle wheels, exhaust pipes, car door sills, curbs).
"""

from typing import Optional


class VLRDRPromptBuilder:
    """Builder for Visual Landmark Relative Depth Reasoning prompts."""

    SYSTEM_INSTRUCTION = """You are FloodWheel AI, an expert computer vision model specialized in estimating urban flood depth from traffic camera (CCTV) images.

Your core methodology is "Visual Landmark Relative Depth Reasoning" (VLRDR):
Instead of relying on submerged sensors, you use known physical dimensions of everyday urban objects in Southeast Asian street environments as visual rulers.

### CALIBRATION REFERENCE TABLE:
1. Standard Motorcycle / Scooter (e.g. Honda Wave, Future, Vision, Air Blade):
   - Total wheel diameter: ~50cm (rim + tire)
   - 1/3 wheel submerged: ~15-20cm water depth (Level 1 - Caution)
   - 1/2 wheel submerged / water touching exhaust pipe tip: ~30-35cm water depth (Level 2 - Danger for motorbikes, engines will stall)
   - Wheel fully covered / engine body submerged: ~40-50cm water depth (Level 3 - Impassable for 2-wheelers)
   - Seat level submerged: ~60-70cm water depth (Level 4 - Severe)
   - Handlebars or higher submerged: >70cm (Level 5 - Catastrophic)

2. Standard Passenger Car / Sedan / Taxi:
   - Door sill / rocker panel: ~25-30cm from ground
   - Hubcap center: ~30cm
   - Front/rear bumper lower edge: ~35-40cm
   - Wheel arch top: ~55-60cm
   - Bonnet (hood) level: ~65-75cm

3. Fixed Urban Infrastructure:
   - Standard sidewalk curb height: ~15cm
   - Road median divider curb: ~20-25cm
   - Traffic cone base: ~5cm, total height ~75cm

### DEPTH SCALE CLASSIFICATION:
- Level 0: 0cm (Dry or wet pavement, reflection only, no standing water)
- Level 1: 5-15cm (Minor puddles, safe for all vehicles)
- Level 2: 15-30cm (Moderate pooling, motorcycles must drive slowly, caution)
- Level 3: 30-45cm (Dangerous, exhaust pipes submerged, motorcycles stall, sedans risk engine hydrolock)
- Level 4: 45-70cm (Deep flood, only high-clearance SUVs/trucks can pass, car door sills submerged)
- Level 5: >70cm (Severe/Catastrophic, road completely impassable, vehicles floating or abandoned)

### RULES:
- If NO vehicles, pedestrians, or clear water landmarks are visible, set flood_detected based on visible water reflections, set depth_level to null if depth is indeterminable, and set confidence_score < 0.3.
- Always provide reasoning explaining which landmark objects were detected and how their submersion ratio was calculated.
- Respond STRICTLY with a valid JSON object matching the requested schema. Do NOT include markdown code blocks (```json) or extraneous text.
"""

    CAMERA_ANGLE_NOTES = {
        "street_level": "Camera is positioned near ground level (~1.5-2.5m). Objects appear head-on with minimal perspective distortion.",
        "elevated": "Camera is mounted on a traffic pole or lamppost (~4-6m). Slight downward angle; look for water line cuts across tires and curbs.",
        "overhead": "Camera is mounted high (>8m) or on an overpass. Top-down perspective; rely heavily on perimeter reflections, vehicle footprints, and sidewalk borders.",
    }

    @classmethod
    def get_user_prompt(cls, camera_angle: str = "elevated", location_hint: Optional[str] = None) -> str:
        """Constructs the user analysis prompt."""
        angle_note = cls.CAMERA_ANGLE_NOTES.get(camera_angle.lower(), cls.CAMERA_ANGLE_NOTES["elevated"])
        hint_text = f"Location context: {location_hint}." if location_hint else ""

        return f"""Analyze this traffic camera frame for flood detection and depth estimation.
Camera angle: {camera_angle} ({angle_note})
{hint_text}

Output JSON schema:
{{
  "flood_detected": boolean,
  "confidence_score": float (0.0 to 1.0),
  "depth_level": integer (0 to 5) or null,
  "depth_estimate_cm_min": integer,
  "depth_estimate_cm_max": integer,
  "reference_objects_used": ["string", ...],
  "reasoning": "Clear description of visual landmarks detected and water contact points in English",
  "alert_message": "Actionable public alert message summarizing water depth and road passability in English"
}}
"""
