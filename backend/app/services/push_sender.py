import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


class PushSender:
    """Formats and sends Web Push and browser notifications for flood alerts."""

    @staticmethod
    def build_notification_payload(
        title: str,
        body: str,
        zone_id: str,
        depth_level: int,
    ) -> Dict[str, Any]:
        return {
            "notification": {
                "title": f"🚨 FloodWheel: {title}",
                "body": body,
                "icon": "/icons/icon-192x192.png",
                "badge": "/icons/badge-72x72.png",
                "tag": f"flood-{zone_id}",
                "data": {
                    "zone_id": zone_id,
                    "depth_level": depth_level,
                    "url": f"/dashboard?zone={zone_id}",
                },
            }
        }
