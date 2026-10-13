"""Gemini API Invoker with google-genai and legacy fallback."""

import asyncio
import io
import logging
from typing import Any, Dict, Optional, Tuple
from PIL import Image

logger = logging.getLogger("floodwheel.gemini_invoker")


class GeminiInvoker:
    """Executes requests against Gemini API or returns realistic mock responses."""

    @staticmethod
    async def call_api(
        client: Any,
        model: str,
        image_bytes: bytes,
        system_instruction: str,
        user_prompt: str,
    ) -> Tuple[str, Optional[int]]:
        """Internal call to the Google GenAI SDK using the provided client instance."""
        pil_image = Image.open(io.BytesIO(image_bytes))

        if hasattr(client, "models") and hasattr(client.models, "generate_content"):
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "system_instruction": system_instruction,
                "temperature": 0.1,
                "response_mime_type": "application/json",
            }

            if hasattr(types, "ThinkingConfig"):
                try:
                    config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
                except Exception:
                    pass

            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=[pil_image, user_prompt],
                config=types.GenerateContentConfig(**config_kwargs),
            )
            tokens = getattr(response.usage_metadata, "total_token_count", None) if hasattr(response, "usage_metadata") else None
            return response.text, tokens

        elif hasattr(client, "GenerativeModel"):
            gen_model = client.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
            )
            response = await asyncio.to_thread(gen_model.generate_content, [user_prompt, pil_image])
            return response.text, None

        raise RuntimeError("No compatible Gemini SDK instance available")

    @staticmethod
    async def mock_analysis(image_bytes: bytes) -> Tuple[str, str, float, Optional[int]]:
        """Realistic mock analysis for offline / development / demo testing."""
        await asyncio.sleep(0.3)
        mock_json = """{
  "flood_detected": true,
  "confidence_score": 0.92,
  "depth_level": 3,
  "depth_estimate_cm_min": 30,
  "depth_estimate_cm_max": 38,
  "reference_objects_used": ["Honda Wave motorcycle rear wheel", "exhaust pipe", "sidewalk curb"],
  "reasoning": "Water level reaches half of the motorcycle rear wheel diameter (~50cm) and submerges the exhaust pipe tip. The 15cm sidewalk curb is completely submerged underwater.",
  "alert_message": "Flooding 30-38cm! Motorcycle exhaust pipes are submerged. Two-wheelers and low-clearance sedans should avoid this corridor."
}"""
        return mock_json, "mock-vlrdr-engine", 0.35, 420
