import asyncio
import logging
from typing import Any, Dict, List
import httpx

logger = logging.getLogger(__name__)


class WebhookDelivery:
    """Dispatches real-time flood warning payloads to ride-hailing and emergency partner webhooks."""

    def __init__(self):
        # Default partner webhook subscribers (e.g., Grab Logistics, ShopeeFood, Municipal Ops)
        self.subscribers: List[str] = [
            "https://httpbin.org/post",  # mock subscriber for testing
        ]

    def register_subscriber(self, webhook_url: str) -> None:
        if webhook_url not in self.subscribers:
            self.subscribers.append(webhook_url)

    async def broadcast_alert(self, payload: Dict[str, Any]) -> int:
        """Broadcasts alert payload to all registered webhook endpoints with retries.

        Returns:
            Number of successful deliveries
        """
        successful_dispatches = 0

        for url in self.subscribers:
            dispatched = False
            for attempt in range(1, 4):
                try:
                    async with httpx.AsyncClient(timeout=3.0) as client:
                        resp = await client.post(url, json=payload)
                        if resp.status_code in [200, 201, 202, 204]:
                            logger.info(f"Webhook delivered successfully to {url} (attempt {attempt})")
                            dispatched = True
                            break
                except Exception as e:
                    logger.warning(f"Webhook dispatch to {url} failed (attempt {attempt}): {e}")
                    await asyncio.sleep(0.5)

            if dispatched:
                successful_dispatches += 1

        return successful_dispatches


webhook_delivery = WebhookDelivery()
