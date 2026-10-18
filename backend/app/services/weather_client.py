import logging
from typing import Tuple
import httpx

logger = logging.getLogger(__name__)


class WeatherClient:
    """Fetches real-time precipitation from Open-Meteo API to dynamically adjust camera polling rates."""

    OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

    @classmethod
    async def get_rainfall_rate(cls, lat: float = 10.7769, lng: float = 106.7009) -> float:
        """Fetches current precipitation in mm/hour."""
        params = {
            "latitude": lat,
            "longitude": lng,
            "current": "precipitation,rain",
            "timezone": "Asia/Ho_Chi_Minh",
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(cls.OPEN_METEO_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    current = data.get("current", {})
                    precip = current.get("precipitation", 0.0)
                    return float(precip)
        except Exception as e:
            logger.info(f"Open-Meteo query skipped or timed out ({e}). Using default condition.")
        return 0.0

    @classmethod
    async def get_recommended_polling_interval(cls, lat: float = 10.7769, lng: float = 106.7009) -> Tuple[int, str]:
        """Calculates dynamic polling interval in seconds based on rainfall intensity.

        Returns:
            Tuple[interval_seconds, weather_condition_label]
        """
        rainfall = await cls.get_rainfall_rate(lat, lng)

        if rainfall > 10.0:
            return 30, f"Heavy Torrential Rain ({rainfall} mm/h) — Emergency 30s Polling Cycle"
        elif rainfall > 2.0:
            return 60, f"Moderate Rain ({rainfall} mm/h) — Standard 60s Polling Cycle"
        else:
            return 300, f"Dry / Light Drizzle ({rainfall} mm/h) — Eco 300s Polling Cycle"
