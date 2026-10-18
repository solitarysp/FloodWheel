"""Production client for Gemini Multimodal Vision API with multi-key rotation and rate-limit guard."""

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.services.gemini.invoker import GeminiInvoker
from app.services.gemini.pool import GeminiClientPool
from app.services.vlrdr_prompt import VLRDRPromptBuilder

logger = logging.getLogger(__name__)


class GeminiClient:
    """Production client for Gemini Multimodal Vision API with multi-key rotation and rate-limit guard."""

    _analysis_semaphore: Optional[asyncio.Semaphore] = None
    _last_call_timestamp: float = 0.0

    @classmethod
    def _get_semaphore(cls) -> asyncio.Semaphore:
        if cls._analysis_semaphore is None:
            concurrency = max(1, getattr(settings, "AI_ANALYSIS_CONCURRENCY", 1))
            cls._analysis_semaphore = asyncio.Semaphore(concurrency)
        return cls._analysis_semaphore

    @classmethod
    def _get_lock(cls):
        """Backward-compatibility alias."""
        return cls._get_semaphore()

    @classmethod
    def set_concurrency(cls, concurrency: int) -> None:
        """Dynamically adjusts the concurrency semaphore for AI analyses."""
        c = max(1, int(concurrency))
        settings.AI_ANALYSIS_CONCURRENCY = c
        cls._analysis_semaphore = asyncio.Semaphore(c)

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.pool = GeminiClientPool(api_key=api_key)
        self.api_keys = self.pool.api_keys
        self._clients_pool = self.pool._clients_pool
        self._key_cooldowns = self.pool._key_cooldowns

        self.primary_model = model_name or settings.GEMINI_MODEL
        self.fallback_model = settings.GEMINI_FALLBACK_MODEL
        self.min_call_interval = float(getattr(settings, "GEMINI_MIN_CALL_INTERVAL_SECONDS", 6.0))

        # Backward compatibility attributes
        self.api_key = self.api_keys[0] if self.api_keys else None
        self._client = self._clients_pool[0][1] if self._clients_pool else None

    async def analyze_image_bytes(
        self,
        image_bytes: bytes,
        camera_angle: str = "elevated",
        location_hint: Optional[str] = None,
        max_retries: int = 3,
    ) -> Tuple[str, str, float, Optional[int]]:
        """Analyzes an image using Gemini Vision with concurrency control and pacing."""
        sem = self._get_semaphore()
        async with sem:
            concurrency = max(1, getattr(settings, "AI_ANALYSIS_CONCURRENCY", 1))
            if concurrency == 1 and self.min_call_interval > 0:
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

        if not self.pool.has_clients:
            return await GeminiInvoker.mock_analysis(image_bytes)

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
                key, client = self.pool.acquire_next_client()
                if not client or not key:
                    break

                masked_key = f"...{key[-6:]}" if len(key) > 6 else "***"
                start_time = time.time()

                try:
                    logger.info(
                        f"Submitting frame to Gemini model={model} using key [{masked_key}] "
                        f"(attempt {attempt}/{max_retries})"
                    )
                    raw_text, tokens = await GeminiInvoker.call_api(
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
                    err_str = str(exc)

                    if any(kw in err_str for kw in ["404", "NOT_FOUND", "no longer available", "not found"]):
                        logger.warning(
                            f"Model '{model}' is not available ({exc}). Advancing to next candidate model."
                        )
                        break

                    is_rate_limit = any(
                        kw in err_str.upper()
                        for kw in ["429", "RESOURCE_EXHAUSTED", "RATE LIMIT", "QUOTA EXCEEDED", "TOO MANY REQUESTS"]
                    )

                    if is_rate_limit:
                        self.pool.set_cooldown(key, 30.0)
                        logger.warning(
                            f"Gemini 429 Rate Limit hit on key [{masked_key}] (model={model}, attempt={attempt}). "
                            f"Key placed on 30s cooldown."
                        )
                        next_key, _ = self.pool.acquire_next_client()
                        if next_key and next_key != key and time.time() >= self.pool.get_cooldown(next_key):
                            logger.info(f"Rotating immediately to available key [...{next_key[-6:]}] for retry.")
                            await asyncio.sleep(2.0)
                            continue

                        now = time.time()
                        earliest_cooldown = min(self.pool._key_cooldowns.values()) if self.pool._key_cooldowns else now + 20.0
                        delay = max(15.0, earliest_cooldown - now)
                        logger.warning(f"All Gemini keys are rate-limited. Cooling down for {delay:.1f}s before retry...")
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
        return await GeminiInvoker.mock_analysis(image_bytes)
