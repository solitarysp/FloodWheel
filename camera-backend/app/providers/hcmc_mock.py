"""HCMC Municipal Camera Mock Frame Generator.

Generates realistic high-contrast synthetic CCTV frames with timestamp
and location overlay when camera feeds are unavailable.
"""

from datetime import datetime, timezone
import io
from typing import Optional
from PIL import Image, ImageDraw


class HCMCMockFrameGenerator:
    """Generates synthetic CCTV frames for fallback display."""

    @classmethod
    def generate_mock_frame(cls, camera_id: str, camera_name: str = "") -> bytes:
        """Generates a high-contrast synthetic CCTV frame with timestamp and location overlay."""
        width, height = 640, 360
        img = Image.new("RGB", (width, height), color=(24, 28, 36))
        draw = ImageDraw.Draw(img)

        # Draw urban street representation (sky, road, sidewalk, flood puddle)
        draw.rectangle([(0, 0), (width, 140)], fill=(35, 42, 54))  # Sky / background
        draw.rectangle([(0, 140), (width, 160)], fill=(80, 85, 95))  # Curb line
        draw.rectangle([(0, 160), (width, height)], fill=(45, 50, 58))  # Asphalt road

        # Simulate water reflections / standing water on lower roadway
        draw.rectangle([(50, 220), (590, 320)], fill=(38, 62, 78))  # Flood pool reflection
        draw.line([(0, 220), (width, 220)], fill=(60, 95, 120), width=2)

        # Vehicle silhouette landmark (motorcycle wheels touching flood line)
        draw.ellipse([(260, 210), (310, 260)], fill=(20, 20, 20), outline=(100, 100, 100))
        draw.rectangle([(280, 170), (360, 220)], fill=(50, 55, 65))

        # CCTV OSD Header
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        osd_title = f"HCMC CCTV: {camera_name or camera_id}"

        # OSD text background bar
        draw.rectangle([(0, 0), (width, 36)], fill=(15, 18, 24))
        draw.text((12, 10), osd_title, fill=(0, 240, 160))
        draw.text((360, 10), now_str, fill=(220, 225, 230))

        # Bottom overlay bar
        draw.rectangle([(0, height - 28), (width, height)], fill=(15, 18, 24))
        draw.text(
            (12, height - 20),
            "GIAO THONG TP. HO CHI MINH — LIVE TRAFFIC MONITOR",
            fill=(180, 190, 200),
        )

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
