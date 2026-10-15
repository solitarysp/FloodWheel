"""Gemini API Invoker with google-genai, OpenAI-compatible proxy, and legacy fallback."""

import asyncio
import base64
import io
import json
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
        """Dispatches API request to OpenAI gateway proxy or Google GenAI SDK."""
        # 1. Custom OpenAI-compatible gateway (e.g. 9router.thanhlv.com, OneAPI)
        if hasattr(client, "endpoint") and hasattr(client, "api_key"):
            return await GeminiInvoker._call_openai_gateway(
                client=client,
                model=model,
                image_bytes=image_bytes,
                system_instruction=system_instruction,
                user_prompt=user_prompt,
            )

        # 2. Google GenAI official SDK
        pil_image = Image.open(io.BytesIO(image_bytes))

        if hasattr(client, "models") and hasattr(client.models, "generate_content"):
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "system_instruction": system_instruction,
                "temperature": 0.0,
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
                generation_config={"temperature": 0.0, "response_mime_type": "application/json"},
            )
            response = await asyncio.to_thread(gen_model.generate_content, [user_prompt, pil_image])
            return response.text, None

        raise RuntimeError("No compatible Gemini SDK instance available")

    @staticmethod
    async def _call_openai_gateway(
        client: Any,
        model: str,
        image_bytes: bytes,
        system_instruction: str,
        user_prompt: str,
    ) -> Tuple[str, Optional[int]]:
        """Calls OpenAI-compatible /chat/completions endpoint with image payload."""
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}},
                    ],
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {client.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }

        # Try httpx first (asyncio native)
        try:
            import httpx

            async with httpx.AsyncClient(timeout=40.0) as http_client:
                resp = await http_client.post(client.endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                tokens = data.get("usage", {}).get("total_tokens")
                return raw_text, tokens
        except ImportError:
            # Fallback to standard urllib in thread
            import urllib.request

            def _sync_post() -> Tuple[str, Optional[int]]:
                req = urllib.request.Request(
                    client.endpoint,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                )
                with urllib.request.urlopen(req, timeout=40.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    text = data["choices"][0]["message"]["content"]
                    toks = data.get("usage", {}).get("total_tokens")
                    return text, toks

            return await asyncio.to_thread(_sync_post)

    @staticmethod
    async def mock_analysis(image_bytes: bytes) -> Tuple[str, str, float, Optional[int]]:
        """Safe fallback analysis when AI service is unreachable (defaults to dry road)."""
        await asyncio.sleep(0.1)
        mock_json = """{
  "flood_detected": false,
  "confidence_score": 0.85,
  "depth_level": 0,
  "depth_estimate_cm_min": 0,
  "depth_estimate_cm_max": 0,
  "reference_objects_used": ["road surface", "curb"],
  "reasoning": "Normal road condition. Road surface is clear, traffic moves freely with no standing water or submerged landmarks.",
  "alert_message": "No flood detected. Traffic conditions normal."
}"""
        return mock_json, "mock-vlrdr-engine", 0.1, 100
