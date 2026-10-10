import pytest
from app.services.gemini_client import GeminiClient


@pytest.mark.asyncio
async def test_gemini_client_mock_fallback():
    # In test mode without API key, client falls back to mock analysis
    client = GeminiClient(api_key=None)
    dummy_bytes = b"fake-image-bytes"

    raw_text, model, elapsed, tokens = await client.analyze_image_bytes(dummy_bytes)
    assert "flood_detected" in raw_text
    assert "mock" in model
    assert elapsed > 0
