import pytest
from app.routers.flood import haversine_distance


def test_haversine_distance():
    # Distance between District 1 (10.7725, 106.6985) and Binh Thanh (10.7938, 106.7196) is roughly 3.3 km
    dist = haversine_distance(10.7725, 106.6985, 10.7938, 106.7196)
    assert 2.5 < dist < 4.5

    # Same location should be 0
    assert haversine_distance(10.5, 106.5, 10.5, 106.5) == 0.0
