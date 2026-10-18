from datetime import datetime, timedelta, timezone
from typing import Dict, Set


class DeduplicationGuard:
    """Guards against sending duplicate alerts for the same flood zone within a cooldown window."""

    def __init__(self, cooldown_minutes: int = 15):
        self.cooldown = timedelta(minutes=cooldown_minutes)
        self._sent_alerts: Dict[str, datetime] = {}

    def should_send(self, zone_id: str, depth_level: int) -> bool:
        """Determines if an alert for the zone and level should be dispatched."""
        key = f"{zone_id}:L{depth_level}"
        now = datetime.now(timezone.utc)

        if key in self._sent_alerts:
            last_sent = self._sent_alerts[key]
            if now - last_sent < self.cooldown:
                return False

        self._sent_alerts[key] = now
        return True

    def clear(self, zone_id: str) -> None:
        """Clears deduplication keys when a zone recovers."""
        keys_to_del = [k for k in self._sent_alerts if k.startswith(f"{zone_id}:")]
        for k in keys_to_del:
            del self._sent_alerts[k]


dedup_guard = DeduplicationGuard()
