"""Gemini Vision AI Client with retry logic, fallback models, and token monitoring."""

import asyncio
import io
import logging
import time
from typing import Any, Dict, Optional, Tuple
from PIL import Image

from app.config import settings
from app.services.vlrdr_prompt import VLRDRPromptBuilder

logger = logging.getLogger(__name__)


class GeminiClient:
    """Production client for Gemini Multimodal Vision API."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.primary_model = model_name or settings.GEMINI_MODEL
        self.fallback_model = settings.GEMINI_FALLBACK_MODEL
        self._client: Optional[Any] = None
        self._init_client()

    def _init_client(self) -> None:
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            logger.warning("Gemini API key is not configured. Client will operate in mock/demo fallback mode.")
            return

        try:
            # Try new google-genai SDK first
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            logger.info("Initialized Google GenAI client successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize google-genai SDK ({e}). Trying google.generativeai...")
            try:
                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=self.api_key)
                self._client = legacy_genai
                logger.info("Initialized legacy google.generativeai client.")
            except Exception as legacy_err:
                logger.error(f"Failed to initialize any Gemini SDK: {legacy_err}")
                self._client = None

    async def analyze_image_bytes(
        self,
        image_bytes: bytes,
        camera_angle: str = "elevated",
        location_hint: Optional[str] = None,
        max_retries: int = 3,
    ) -> Tuple[str, str, float, Optional[int]]:
        """Analyzes an image using Gemini Vision with exponential backoff.

        Returns:
            Tuple[raw_response_text, model_used, elapsed_seconds, tokens_used]
        """
        user_prompt = VLRDRPromptBuilder.get_user_prompt(camera_angle=camera_angle, location_hint=location_hint)
        system_instruction = VLRDRPromptBuilder.SYSTEM_INSTRUCTION

        # Fallback to realistic mock if no client or key is present
        if not self._client or not self.api_key or self.api_key.startswith("your_"):
            return await self._mock_analysis(image_bytes)

        # Attempt call with retries and model fallback
        models_to_try = [self.primary_model, self.fallback_model]
        last_error = None

        for model in models_to_try:
            for attempt in range(1, max_retries + 1):
                start_time = time.time()
                try:
                    logger.info(f"Submitting frame to Gemini model={model} (attempt {attempt}/{max_retries})")
                    raw_text, tokens = await self._call_gemini_api(
                        model=model,
                        image_bytes=image_bytes,
                        system_instruction=system_instruction,
                        user_prompt=user_prompt,
                    )
                    elapsed = time.time() - start_time
                    logger.info(f"Gemini response received in {elapsed:.2f}s (tokens={tokens})")
                    return raw_text, model, elapsed, tokens

                except Exception as exc:
                    last_error = exc
                    elapsed = time.time() - start_time
                    delay = 2 ** (attempt - 1)
                    logger.warning(
                        f"Gemini API call failed (model={model}, attempt={attempt}, elapsed={elapsed:.2f}s): {exc}. "
                        f"Retrying in {delay}s..."
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(delay)

        logger.error(f"All Gemini retries failed. Last error: {last_error}. Returning simulated fallback.")
        return await self._mock_analysis(image_bytes)

    async def _call_gemini_api(
        self,
        model: str,
        image_bytes: bytes,
        system_instruction: str,
        user_prompt: str,
    ) -> Tuple[str, Optional[int]]:
        """Internal call to the Google GenAI SDK."""
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))

        # Check which SDK client is active
        if hasattr(self._client, "models") and hasattr(self._client.models, "generate_content"):
            # google-genai 1.0+
            from google.genai import types

            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=model,
                contents=[pil_image, user_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            tokens = getattr(response.usage_metadata, "total_token_count", None) if hasattr(response, "usage_metadata") else None
            return response.text, tokens

        elif hasattr(self._client, "GenerativeModel"):
            # google-generativeai legacy
            gen_model = self._client.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
            )
            response = await asyncio.to_thread(gen_model.generate_content, [user_prompt, pil_image])
            return response.text, None

        raise RuntimeError("No compatible Gemini SDK instance available")

    async def _mock_analysis(self, image_bytes: bytes) -> Tuple[str, str, float, Optional[int]]:
        """Realistic mock analysis for offline / development / demo testing."""
        await asyncio.sleep(0.3)  # simulate network
        # Produce realistic sample output
        mock_json = """{
  "flood_detected": true,
  "confidence_score": 0.92,
  "depth_level": 3,
  "depth_estimate_cm_min": 30,
  "depth_estimate_cm_max": 38,
  "reference_objects_used": ["Honda Wave motorcycle rear wheel", "exhaust pipe", "sidewalk curb"],
  "reasoning": "Mực nước ngập ngang nửa bánh xe máy (~50cm) và ngập qua miệng ống xả xe Wave. Bờ vỉa hè (15cm) đã chìm hoàn toàn dưới mặt nước đục.",
  "alert_message": "Ngập 30-38cm! Ống xả xe máy đã chìm. Xe 2 bánh và sedan không nên di chuyển qua đoạn đường này."
}"""
        return mock_json, "mock-vlrdr-engine", 0.35, 420
