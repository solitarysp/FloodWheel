from app.services.dedup_guard import DeduplicationGuard


def test_dedup_guard_cooldown():
    guard = DeduplicationGuard(cooldown_minutes=10)

    # First trigger should be allowed
    assert guard.should_send("zone-1", 3) is True

    # Immediate second trigger should be suppressed
    assert guard.should_send("zone-1", 3) is False

    # Different level or different zone should be allowed
    assert guard.should_send("zone-2", 3) is True
    assert guard.should_send("zone-1", 4) is True


def test_dedup_guard_clear():
    guard = DeduplicationGuard(cooldown_minutes=10)
    assert guard.should_send("zone-3", 3) is True
    guard.clear("zone-3")
    # After clear, should allow again
    assert guard.should_send("zone-3", 3) is True
