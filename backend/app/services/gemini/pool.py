"""Gemini Client Pool and Key Rotation Manager."""

import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings

logger = logging.getLogger("floodwheel.gemini_pool")


class GeminiClientPool:
    """Manages API keys, SDK client instances, and cooldown rotation."""

    def __init__(self, api_key: Optional[str] = None):
        all_keys: List[str] = []
        primary = api_key or getattr(settings, "GEMINI_API_KEY", "")
        if primary and primary.strip():
            all_keys.append(primary.strip())

        multi_keys_str = getattr(settings, "GEMINI_API_KEYS", "") or ""
        if multi_keys_str.strip():
            parsed_multi = [k.strip() for k in re.split(r"[,;\n\s]+", multi_keys_str) if k.strip()]
            for k in parsed_multi:
                if k not in all_keys:
                    all_keys.append(k)

        self.api_keys: List[str] = [
            k for k in all_keys
            if not k.startswith("your_") and k != "your_gemini_api_key_here"
        ]

        self._clients_pool: List[Tuple[str, Any]] = []
        self._key_cooldowns: Dict[str, float] = {}
        self._current_client_idx: int = 0
        self._init_clients()

    def _init_clients(self) -> None:
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

    def acquire_next_client(self) -> Tuple[Optional[str], Optional[Any]]:
        """Round-robin selection of next available client, skipping keys in cooldown."""
        if not self._clients_pool:
            return None, None

        now = time.time()
        pool_size = len(self._clients_pool)

        for i in range(pool_size):
            idx = (self._current_client_idx + i) % pool_size
            key, client = self._clients_pool[idx]
            cooldown_until = self._key_cooldowns.get(key, 0.0)
            if now >= cooldown_until:
                self._current_client_idx = (idx + 1) % pool_size
                return key, client

        soonest_idx = min(
            range(pool_size),
            key=lambda i: self._key_cooldowns.get(self._clients_pool[i][0], 0.0),
        )
        self._current_client_idx = (soonest_idx + 1) % pool_size
        return self._clients_pool[soonest_idx]

    def set_cooldown(self, key: str, duration_seconds: float = 30.0) -> None:
        self._key_cooldowns[key] = time.time() + duration_seconds

    def get_cooldown(self, key: str) -> float:
        return self._key_cooldowns.get(key, 0.0)

    @property
    def has_clients(self) -> bool:
        return bool(self._clients_pool)
