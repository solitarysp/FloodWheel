from locust import HttpUser, task, between


class FloodWheelLoadUser(HttpUser):
    wait_time = between(1, 3)

    @task(4)
    def view_heatmap(self):
        """Simulates commuters and maps apps fetching live GeoJSON heatmap."""
        self.client.get("/api/v1/flood/heatmap")

    @task(3)
    def query_gps_status(self):
        """Simulates mobile users querying nearest flood zones by GPS."""
        self.client.get("/api/v1/flood/status?lat=10.7938&lng=106.7196&radius_km=4")

    @task(2)
    def check_route_safety(self):
        """Simulates Grab/ShopeeFood route passability check."""
        self.client.post(
            "/api/v1/route/safety",
            json={
                "vehicle_type": "motorcycle",
                "waypoints": [
                    [10.7938, 106.7196],
                    [10.7950, 106.7210],
                    [10.8000, 106.7250],
                ],
            },
        )

    @task(1)
    def health_check(self):
        """Uptime monitoring probe."""
        self.client.get("/api/v1/health")
