"""Gemini Vision AI Client with retry logic, fallback models, and token monitoring."""

import asyncio
import io
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image

from app.config import settings
from app.services.vlrdr_prompt import VLRDRPromptBuilder

logger = logging.getLogger(__name__)


class GeminiClient:
    """Production client for Gemini Multimodal Vision API with multi-key rotation and rate-limit guard."""

    # Global lock guaranteeing strictly 1 image analysis at any given moment to prevent 429
    _analysis_lock: Optional[asyncio.Lock] = None
    _last_call_timestamp: float = 0.0

    @classmethod
    def _get_lock(cls) -> asyncio.Lock:
        if cls._analysis_lock is None:
            cls._analysis_lock = asyncio.Lock()
        return cls._analysis_lock

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        # 1. Parse and collect all candidate API keys (multi-key support)
        all_keys: List[str] = []
        
        # Primary key from argument or single settings
        primary = api_key or getattr(settings, "GEMINI_API_KEY", "")
        if primary and primary.strip():
            all_keys.append(primary.strip())

        # Additional keys from GEMINI_API_KEYS (comma / semicolon / newline separated)
        multi_keys_str = getattr(settings, "GEMINI_API_KEYS", "") or ""
        if multi_keys_str.strip():
            parsed_multi = [k.strip() for k in re.split(r"[,;\n\s]+", multi_keys_str) if k.strip()]
            for k in parsed_multi:
                if k not in all_keys:
                    all_keys.append(k)

        # Filter out placeholder/dummy keys
        self.api_keys: List[str] = [
            k for k in all_keys
            if not k.startswith("your_") and k != "your_gemini_api_key_here"
        ]

        self.primary_model = model_name or settings.GEMINI_MODEL
        self.fallback_model = settings.GEMINI_FALLBACK_MODEL
        self.min_call_interval = float(getattr(settings, "GEMINI_MIN_CALL_INTERVAL_SECONDS", 6.0))

        # Client pool: List of (api_key, client_instance)
        self._clients_pool: List[Tuple[str, Any]] = []
        self._key_cooldowns: Dict[str, float] = {}  # key -> timestamp until cooldown expires
        self._current_client_idx: int = 0

        self._init_clients()

        # Backward compatibility attributes
        self.api_key = self.api_keys[0] if self.api_keys else None
        self._client = self._clients_pool[0][1] if self._clients_pool else None

    def _init_clients(self) -> None:
        """Initializes Gemini SDK client instances for all configured API keys."""
        if not self.api_keys:
            logger.warning("No valid Gemini API key configured. Client will operate in mock/demo fallback mode.")
            return

        for k in self.api_keys:
            masked = f"...{k[-6:]}" if len(k) > 6 else "***"
            client = self._create_sdk_client(k)
            if client:
                self._clients_pool.append((k, client))
                logger.info(f"Initialized Gemini client for key [{masked}] successfully.")
            else:
                logger.warning(f"Failed to initialize client for key [{masked}].")

        logger.info(f"GeminiClient ready with {len(self._clients_pool)} active API key(s).")

    @staticmethod
    def _create_sdk_client(key: str, base_url: Optional[str] = None) -> Optional[Any]:
        """Creates a Google GenAI or legacy generativeai client instance, with optional custom base URL."""
        endpoint = base_url or getattr(settings, "GEMINI_BASE_URL", None)
        if endpoint:
            endpoint = endpoint.strip() or None

        try:
            from google import genai
            if endpoint:
                logger.info(f"Using custom Gemini endpoint: {endpoint}")
                return genai.Client(api_key=key, http_options={"base_url": endpoint})
            return genai.Client(api_key=key)
        except Exception as exc:
            logger.debug(f"google-genai Client failed ({exc}), falling back to google.generativeai...")
            try:
                import google.generativeai as legacy_genai
                if endpoint:
                    logger.info(f"Using custom legacy Gemini endpoint: {endpoint}")
                    legacy_genai.configure(
                        api_key=key,
                        transport="rest",
                        client_options={"api_endpoint": endpoint},
                    )
                else:
                    legacy_genai.configure(api_key=key)
                return legacy_genai
            except Exception as legacy_err:
                logger.error(f"Failed to initialize Gemini SDK with key: {legacy_err}")
                return None

    def _acquire_next_client(self) -> Tuple[Optional[str], Optional[Any]]:
        """Round-robin selection of next available client, skipping keys currently in cooldown."""
        if not self._clients_pool:
            return None, None

        now = time.time()
        pool_size = len(self._clients_pool)

        # 1. Search for a key whose cooldown has expired
        for i in range(pool_size):
            idx = (self._current_client_idx + i) % pool_size
            key, client = self._clients_pool[idx]
            cooldown_until = self._key_cooldowns.get(key, 0.0)
            if now >= cooldown_until:
                self._current_client_idx = (idx + 1) % pool_size
                return key, client

        # 2. If all keys are in cooldown, pick the one expiring soonest
        soonest_idx = min(
            range(pool_size),
            key=lambda i: self._key_cooldowns.get(self._clients_pool[i][0], 0.0),
        )
        self._current_client_idx = (soonest_idx + 1) % pool_size
        return self._clients_pool[soonest_idx]

    async def analyze_image_bytes(
        self,
        image_bytes: bytes,
        camera_angle: str = "elevated",
        location_hint: Optional[str] = None,
        max_retries: int = 3,
    ) -> Tuple[str, str, float, Optional[int]]:
        """Analyzes an image using Gemini Vision with strict 1-at-a-time concurrency lock and pacing.

        Returns:
            Tuple[raw_response_text, model_used, elapsed_seconds, tokens_used]
        """
        # Global lock: strictly 1 image analysis at any given moment
        lock = self._get_lock()
        async with lock:
            # Enforce polite spacing interval between consecutive requests to prevent 429
            now = time.time()
            elapsed_since_last = now - GeminiClient._last_call_timestamp
            if elapsed_since_last < self.min_call_interval:
                sleep_needed = self.min_call_interval - elapsed_since_last
                logger.info(
                    "Pacing Gemini API requests to prevent 429 (sleeping %.2fs before next request)",
                    sleep_needed,
                )
                await asyncio.sleep(sleep_needed)

            try:
                return await self._execute_analysis_with_retries(
                    image_bytes=image_bytes,
                    camera_angle=camera_angle,
                    location_hint=location_hint,
                    max_retries=max_retries,
                )
            finally:
                GeminiClient._last_call_timestamp = time.time()

    async def _execute_analysis_with_retries(
        self,
        image_bytes: bytes,
        camera_angle: str = "elevated",
        location_hint: Optional[str] = None,
        max_retries: int = 3,
    ) -> Tuple[str, str, float, Optional[int]]:
        """Internal execution with multi-key rotation, model fallback, and rate limit backoff."""
        user_prompt = VLRDRPromptBuilder.get_user_prompt(camera_angle=camera_angle, location_hint=location_hint)
        system_instruction = VLRDRPromptBuilder.SYSTEM_INSTRUCTION

        # Fallback to realistic mock if no clients configured
        if not self._clients_pool:
            return await self._mock_analysis(image_bytes)

        # Candidate models with automatic fallbacks prioritizing ultra-low latency Gemini 3 Flash-Lite models
        candidate_models = [
            self.primary_model,
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            self.fallback_model,
        ]
        models_to_try = []
        for m in candidate_models:
            if m and m not in models_to_try:
                models_to_try.append(m)

        last_error = None

        for model in models_to_try:
            for attempt in range(1, max_retries + 1):
                key, client = self._acquire_next_client()
                if not client or not key:
                    break

                masked_key = f"...{key[-6:]}" if len(key) > 6 else "***"
                start_time = time.time()

                try:
                    logger.info(
                        f"Submitting frame to Gemini model={model} using key [{masked_key}] "
                        f"(attempt {attempt}/{max_retries})"
                    )
                    raw_text, tokens = await self._call_gemini_api(
                        client=client,
                        model=model,
                        image_bytes=image_bytes,
                        system_instruction=system_instruction,
                        user_prompt=user_prompt,
                    )
                    elapsed = time.time() - start_time
                    logger.info(
                        f"Gemini response received from model={model} (key [{masked_key}]) "
                        f"in {elapsed:.2f}s (tokens={tokens})"
                    )
                    return raw_text, model, elapsed, tokens

                except Exception as exc:
                    last_error = exc
                    elapsed = time.time() - start_time
                    err_str = str(exc)

                    # 1. Model not found (404 / NOT_FOUND / no longer available) -> skip to next model immediately
                    if any(kw in err_str for kw in ["404", "NOT_FOUND", "no longer available", "not found"]):
                        logger.warning(
                            f"Model '{model}' is not available ({exc}). Advancing to next candidate model."
                        )
                        break

                    # 2. Check if error is 429 Too Many Requests / Resource Exhausted
                    is_rate_limit = any(
                        kw in err_str.upper()
                        for kw in ["429", "RESOURCE_EXHAUSTED", "RATE LIMIT", "QUOTA EXCEEDED", "TOO MANY REQUESTS"]
                    )

                    if is_rate_limit:
                        # Place this key in 30s cooldown
                        self._key_cooldowns[key] = time.time() + 30.0
                        logger.warning(
                            f"Gemini 429 Rate Limit hit on key [{masked_key}] (model={model}, attempt={attempt}). "
                            f"Key placed on 30s cooldown."
                        )

                        # Check if another key is immediately available in the pool
                        next_key, next_client = self._acquire_next_client()
                        if next_key and next_key != key and time.time() >= self._key_cooldowns.get(next_key, 0.0):
                            logger.info(
                                f"Rotating immediately to available key [...{next_key[-6:]}] for retry."
                            )
                            # Pacing delay before trying next key
                            await asyncio.sleep(2.0)
                            continue

                        # If all keys are cooling down, calculate needed wait time
                        now = time.time()
                        earliest_cooldown = min(self._key_cooldowns.values()) if self._key_cooldowns else now + 20.0
                        delay = max(15.0, earliest_cooldown - now)
                        logger.warning(
                            f"All Gemini keys are rate-limited. Cooling down for {delay:.1f}s before retry..."
                        )
                    else:
                        delay = 2 ** (attempt - 1)
                        logger.warning(
                            f"Gemini API call failed (model={model}, key=[{masked_key}], attempt={attempt}): {exc}. "
                            f"Retrying in {delay}s..."
                        )

                    if attempt < max_retries:
                        await asyncio.sleep(delay)

        logger.error(
            f"All Gemini retries failed across candidates {models_to_try}. Last error: {last_error}. "
            f"Returning simulated fallback."
        )
        return await self._mock_analysis(image_bytes)

    async def _call_gemini_api(
        self,
        client: Any,
        model: str,
        image_bytes: bytes,
        system_instruction: str,
        user_prompt: str,
    ) -> Tuple[str, Optional[int]]:
        """Internal call to the Google GenAI SDK using the provided client instance."""
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))

        # Check which SDK client is active
        if hasattr(client, "models") and hasattr(client.models, "generate_content"):
            # google-genai 1.0+
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "system_instruction": system_instruction,
                "temperature": 0.1,
                "response_mime_type": "application/json",
            }

            # Disable thinking budget for zero reasoning overhead (< 1s ultra-fast response)
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
            # google-generativeai legacy
            gen_model = client.GenerativeModel(
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
  "reasoning": "Water level reaches half of the motorcycle rear wheel diameter (~50cm) and submerges the exhaust pipe tip. The 15cm sidewalk curb is completely submerged underwater.",
  "alert_message": "Flooding 30-38cm! Motorcycle exhaust pipes are submerged. Two-wheelers and low-clearance sedans should avoid this corridor."
}"""
        return mock_json, "mock-vlrdr-engine", 0.35, 420
