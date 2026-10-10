from datetime import datetime, timedelta, timezone
from app.services.zone_aggregator import ZoneAggregator


def test_time_decay_recent():
    now = datetime.now(timezone.utc)
    recent = now - timedelta(minutes=5)
    # < 15 mins: no decay
    decayed = ZoneAggregator.apply_time_decay(0.9, recent, now)
    assert decayed == 0.9


def test_time_decay_over_15_minutes():
    now = datetime.now(timezone.utc)
    mid = now - timedelta(minutes=18)
    # 15-25 mins: * 0.7
    decayed = ZoneAggregator.apply_time_decay(0.9, mid, now)
    assert decayed == round(0.9 * 0.7, 2)


def test_time_decay_over_25_minutes():
    now = datetime.now(timezone.utc)
    old = now - timedelta(minutes=30)
    # > 25 mins: * 0.4
    decayed = ZoneAggregator.apply_time_decay(0.9, old, now)
    assert decayed == round(0.9 * 0.4, 2)
