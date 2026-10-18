import pytest
from app.services.weather_client import WeatherClient


@pytest.mark.asyncio
async def test_weather_client_polling_interval():
    # Test method without network dependency or fallback
    interval, note = await WeatherClient.get_recommended_polling_interval()
    assert interval in [30, 60, 300]
    assert len(note) > 5
