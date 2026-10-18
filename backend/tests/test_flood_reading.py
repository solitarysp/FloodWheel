from app.models.flood_reading import FloodReading
from app.services.flood_reading_parser import FloodReadingParser


def test_flood_reading_valid_model():
    reading = FloodReading(
        camera_id="cam-001",
        flood_detected=True,
        confidence_score=0.85,
        depth_level=2,
        depth_estimate_cm_min=20,
        depth_estimate_cm_max=30,
        reference_objects_used=["motorcycle wheel"],
        reasoning="Water reached half of the wheel rim.",
        alert_message="Caution: Water level 20-30cm.",
    )
    assert reading.depth_level == 2
    assert reading.confidence_score == 0.85
    assert reading.flood_detected is True


def test_flood_reading_parser_with_markdown_wrap():
    raw_markdown = """```json
{
  "flood_detected": true,
  "confidence_score": 0.9,
  "depth_level": 3,
  "depth_estimate_cm_min": 30,
  "depth_estimate_cm_max": 40,
  "reference_objects_used": ["exhaust pipe"],
  "reasoning": "Exhaust is submerged.",
  "alert_message": "Water at 35cm."
}
```"""
    parsed = FloodReadingParser.parse(raw_markdown, camera_id="cam-test")
    assert parsed.camera_id == "cam-test"
    assert parsed.depth_level == 3
    assert parsed.depth_estimate_cm_min == 30
    assert parsed.flood_detected is True


def test_flood_reading_parser_fallback_on_corrupt_json():
    corrupt = "This is not json at all! {invalid syntax"
    parsed = FloodReadingParser.parse(corrupt, camera_id="cam-fail")
    assert parsed.camera_id == "cam-fail"
    assert parsed.flood_detected is False
    assert parsed.confidence_score <= 0.3
    assert parsed.depth_level is None
