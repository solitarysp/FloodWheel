"""Unit tests for Admin router logic and endpoint handlers."""

from datetime import datetime, timezone
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.db_models import FloodZone, OperatorOverride
from app.routers.admin import (
    AdminLoginRequest,
    OverrideRequest,
    QueueConfigRequest,
    admin_login,
    set_zone_override,
)
from app.middleware.auth import AdminUser


class TestAdminRouter(unittest.TestCase):
    """Test suite verifying admin login and operations."""

    def test_admin_login_success(self):
        """Verifies valid admin credentials issue a valid bearer token."""
        async def _test():
            req = AdminLoginRequest(username="admin", password="admin123")
            resp = await admin_login(req)
            self.assertEqual(resp.token_type, "bearer")
            self.assertEqual(resp.user.username, "admin")
            self.assertEqual(resp.user.role, "admin")
            self.assertTrue(len(resp.access_token) > 20)

        import asyncio
        asyncio.run(_test())

    def test_admin_login_wrong_password(self):
        """Verifies invalid password raises HTTPException 401."""
        from fastapi import HTTPException

        async def _test():
            req = AdminLoginRequest(username="admin", password="wrongpassword")
            with self.assertRaises(HTTPException) as ctx:
                await admin_login(req)
            self.assertEqual(ctx.exception.status_code, 401)

        import asyncio
        asyncio.run(_test())

    def test_set_zone_override(self):
        """Verifies setting a zone override correctly updates zone depth."""
        async def _test():
            mock_db = AsyncMock()
            mock_zone = FloodZone(
                id="zone-dist1",
                name="Quận 1",
                district="Quận 1",
                center_lat=10.77,
                center_lng=106.70,
                geometry_geojson="{}",
                current_depth_level=0,
                is_overridden=False,
            )
            mock_db.get.return_value = mock_zone

            req = OverrideRequest(
                operator_id="admin",
                override_depth_level=3,
                depth_cm_min=30,
                depth_cm_max=45,
                reason="Kiểm tra thực địa ngập ống xả",
                duration_hours=2,
            )
            admin_user = AdminUser(username="admin", role="admin")

            resp = await set_zone_override(
                zone_id="zone-dist1",
                req=req,
                db=mock_db,
                current_admin=admin_user,
            )

            self.assertTrue(resp.success)
            self.assertEqual(resp.override_depth_level, 3)
            self.assertTrue(mock_zone.is_overridden)
            self.assertEqual(mock_zone.current_depth_level, 3)

        import asyncio
        asyncio.run(_test())


if __name__ == "__main__":
    unittest.main()
