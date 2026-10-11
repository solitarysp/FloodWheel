"""Unit tests for AuthService and admin authentication mechanisms."""

from datetime import timedelta
import unittest
from unittest.mock import patch

from app.services.auth_service import AuthService


class TestAuthService(unittest.TestCase):
    """Test suite verifying HS256 JWT tokens and PBKDF2 password security."""

    def test_password_hash_and_verification(self):
        """Verifies salted password hashing matches correctly and rejects wrong passwords."""
        plain = "SuperAdminPassword@2026"
        hashed = AuthService.hash_password(plain)

        self.assertTrue(hashed.startswith("pbkdf2:sha256:100000$"))
        self.assertTrue(AuthService.verify_password(plain, hashed))
        self.assertFalse(AuthService.verify_password("wrong-password", hashed))
        self.assertFalse(AuthService.verify_password("", hashed))

    def test_direct_password_match(self):
        """Verifies fallback constant-time matching for plaintext config passwords."""
        self.assertTrue(AuthService.verify_password("admin123", "admin123"))
        self.assertFalse(AuthService.verify_password("wrong", "admin123"))

    def test_jwt_issuance_and_validation(self):
        """Verifies JWT issuance, signature verification, and payload extraction."""
        token = AuthService.create_access_token(
            subject="admin_user",
            role="admin",
            expires_delta=timedelta(hours=2),
            extra_claims={"scope": "all"},
        )
        self.assertIsInstance(token, str)
        self.assertEqual(len(token.split(".")), 3)

        payload = AuthService.verify_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], "admin_user")
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["scope"], "all")
        self.assertEqual(payload["iss"], "floodwheel")

    def test_tampered_token_rejected(self):
        """Verifies any alteration of token signature or body causes rejection."""
        token = AuthService.create_access_token(subject="admin")
        parts = token.split(".")
        # Tamper payload
        tampered = f"{parts[0]}.eyJyYW5kb20iOiAidmFsIn0.{parts[2]}"
        self.assertIsNone(AuthService.verify_access_token(tampered))

        # Tamper signature
        tampered_sig = f"{parts[0]}.{parts[1]}.badsignature"
        self.assertIsNone(AuthService.verify_access_token(tampered_sig))

    def test_expired_token_rejected(self):
        """Verifies expired token is discarded."""
        # Issue token that already expired 10 seconds ago
        expired_token = AuthService.create_access_token(
            subject="admin",
            expires_delta=timedelta(seconds=-10),
        )
        self.assertIsNone(AuthService.verify_access_token(expired_token))


if __name__ == "__main__":
    unittest.main()
