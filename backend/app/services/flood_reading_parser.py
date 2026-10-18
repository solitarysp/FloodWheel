"""Parser and validator for Gemini VLRDR output."""

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.models.flood_reading import FloodReading


class FloodReadingParser:
    """Parses and validates raw Gemini LLM responses into structured FloodReading models."""

    @staticmethod
    def clean_json_string(raw_text: str) -> str:
        """Strips markdown code blocks, backticks, and extraneous whitespace."""
        text = raw_text.strip()
        # Remove ```json ... ``` or ``` ... ```
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text)
        return text.strip()

    @classmethod
    def parse(
        cls,
        raw_text: str,
        camera_id: str = "demo-upload",
        timestamp: Optional[datetime] = None,
    ) -> FloodReading:
        """Parses raw Gemini text output into a validated FloodReading object."""
        cleaned = cls.clean_json_string(raw_text)
        ts = timestamp or datetime.now(timezone.utc)

        try:
            data: Dict[str, Any] = json.loads(cleaned)
        except json.JSONDecodeError as err:
            # Fallback for unparseable responses
            return FloodReading(
                camera_id=camera_id,
                timestamp=ts,
                flood_detected=False,
                confidence_score=0.1,
                depth_level=None,
                depth_estimate_cm_min=0,
                depth_estimate_cm_max=0,
                reference_objects_used=[],
                reasoning=f"Failed to parse AI response into structured JSON: {str(err)}. Raw output preview: {raw_text[:100]}",
                alert_message="Unable to evaluate flood depth due to AI response formatting error.",
            )

        # Ensure camera_id and timestamp are populated
        data["camera_id"] = data.get("camera_id") or camera_id
        if "timestamp" not in data or not data["timestamp"]:
            data["timestamp"] = ts

        # Sanitize depth_level
        depth_level = data.get("depth_level")
        if depth_level is not None:
            try:
                data["depth_level"] = max(0, min(5, int(depth_level)))
            except (ValueError, TypeError):
                data["depth_level"] = None

        # Sanitize numeric ranges
        min_cm = data.get("depth_estimate_cm_min", 0)
        max_cm = data.get("depth_estimate_cm_max", 0)
        try:
            min_cm = max(0, int(min_cm))
            max_cm = max(min_cm, int(max_cm))
        except (ValueError, TypeError):
            min_cm, max_cm = 0, 0
        data["depth_estimate_cm_min"] = min_cm
        data["depth_estimate_cm_max"] = max_cm

        # Ensure confidence_score is a valid float 0.0 - 1.0
        conf = data.get("confidence_score", 0.5)
        try:
            data["confidence_score"] = max(0.0, min(1.0, float(conf)))
        except (ValueError, TypeError):
            data["confidence_score"] = 0.5

        # Ensure reference_objects_used is a list
        if not isinstance(data.get("reference_objects_used"), list):
            data["reference_objects_used"] = []

        # Ensure strings
        data["reasoning"] = str(data.get("reasoning", "No visual reasoning provided."))[:1000]
        data["alert_message"] = str(data.get("alert_message", "No active alert advisory."))[:300]

        # Consistency guard: If flood not detected or depth is Level 0, zero out cm estimates
        if not data.get("flood_detected", False) or data.get("depth_level") == 0:
            data["flood_detected"] = False
            data["depth_level"] = 0
            data["depth_estimate_cm_min"] = 0
            data["depth_estimate_cm_max"] = 0

        # Guard against nighttime specular reflection / wet pavement glare false positives
        if data.get("flood_detected", False):
            reasoning_lower = data["reasoning"].lower()
            refs_str = " ".join(str(r).lower() for r in data.get("reference_objects_used", []))

            # Valid physical calibration landmarks
            valid_landmarks = [
                "wheel", "tire", "tyre", "curb", "kerb", "exhaust", "door sill",
                "bumper", "pedestrian", "ankle", "calf", "knee", "rim"
            ]
            has_valid_landmark = any(lm in refs_str or lm in reasoning_lower for lm in valid_landmarks)

            # Explicit indications that it is light glare, wet look, or dry road
            indicates_dry = any(phrase in reasoning_lower for phrase in [
                "no standing water", "zero standing water", "dry road", "surface reflection",
                "specular reflection", "headlight reflection", "light reflection",
                "street light reflection", "dry pavement", "no flood", "not submerged",
                "tires are not submerged", "specular glare", "headlight glare"
            ])

            # If confidence is low, or no valid calibration landmark exists, or reasoning indicates dry/reflection
            if indicates_dry or not has_valid_landmark or data.get("confidence_score", 0.0) < 0.35:
                data["flood_detected"] = False
                data["depth_level"] = 0
                data["depth_estimate_cm_min"] = 0
                data["depth_estimate_cm_max"] = 0
                data["alert_message"] = "No flood detected. Road surface is clear."
                if not has_valid_landmark:
                    data["reasoning"] += " (Filtered out: no physical submerged landmarks found; light reflection on asphalt)."

        return FloodReading.model_validate(data)
