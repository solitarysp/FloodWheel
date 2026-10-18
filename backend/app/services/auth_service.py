"""Authentication and Security Service for Admin Operations.

Provides zero-dependency, standards-compliant HS256 JWT generation and validation,
along with PBKDF2-HMAC-SHA256 salted password hashing and credential verification.
"""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import logging
import os
import secrets
from typing import Any, Dict, Optional

from app.config import settings

logger = logging.getLogger("floodwheel.auth_service")


class AuthService:
    """Security service managing admin password hashing, token issuance, and validation."""

    @staticmethod
    def _b64url_encode(data: bytes) -> str:
        """Encodes raw bytes to base64url string without trailing padding."""
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    @staticmethod
    def _b64url_decode(s: str) -> bytes:
        """Decodes base64url string back to raw bytes, adding necessary padding."""
        padding = 4 - (len(s) % 4)
        if padding != 4:
            s += "=" * padding
        return base64.urlsafe_b64decode(s.encode("utf-8"))

    @classmethod
    def hash_password(cls, password: str, salt: Optional[str] = None) -> str:
        """Hashes a password using PBKDF2-HMAC-SHA256 with a secure 16-byte random salt."""
        salt_hex = salt or secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_hex.encode("utf-8"),
            iterations=100000,
        )
        return f"pbkdf2:sha256:100000${salt_hex}${key.hex()}"

    @classmethod
    def verify_password(cls, plain_password: str, stored_hash_or_plain: str) -> bool:
        """Verifies a plain password against PBKDF2 hash or configured plaintext credential."""
        if not plain_password or not stored_hash_or_plain:
            return False

        # If stored is a PBKDF2 string
        if stored_hash_or_plain.startswith("pbkdf2:sha256:"):
            try:
                parts = stored_hash_or_plain.split("$")
                if len(parts) == 3:
                    salt_hex = parts[1]
                    expected_key = parts[2]
                    calc_key = hashlib.pbkdf2_hmac(
                        "sha256",
                        plain_password.encode("utf-8"),
                        salt_hex.encode("utf-8"),
                        iterations=100000,
                    ).hex()
                    return hmac.compare_digest(calc_key, expected_key)
            except Exception as e:
                logger.error("Error verifying PBKDF2 hash: %s", e)
                return False

        # Fallback to constant-time comparison for plain admin password in config
        return hmac.compare_digest(plain_password, stored_hash_or_plain)

    @classmethod
    def create_access_token(
        cls,
        subject: str,
        role: str = "admin",
        expires_delta: Optional[timedelta] = None,
        extra_claims: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generates a standard HS256-signed JWT token."""
        secret = (settings.ADMIN_JWT_SECRET or settings.SECRET_KEY).encode("utf-8")
        now = datetime.now(timezone.utc)
        delta = expires_delta or timedelta(hours=settings.ADMIN_TOKEN_EXPIRE_HOURS)
        exp = now + delta

        header = {"alg": "HS256", "typ": "JWT"}
        payload: Dict[str, Any] = {
            "sub": subject,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "iss": "floodwheel",
        }
        if extra_claims:
            payload.update(extra_claims)

        header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        encoded_header = cls._b64url_encode(header_bytes)
        encoded_payload = cls._b64url_encode(payload_bytes)

        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        signature = hmac.new(secret, signing_input, hashlib.sha256).digest()
        encoded_sig = cls._b64url_encode(signature)

        return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

    @classmethod
    def verify_access_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Validates an HS256 JWT signature and expiration, returning payload if valid."""
        if not token:
            return None

        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_sig = parts
        secret = (settings.ADMIN_JWT_SECRET or settings.SECRET_KEY).encode("utf-8")

        # Verify signature
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
        expected_sig_str = cls._b64url_encode(expected_sig)

        if not hmac.compare_digest(encoded_sig, expected_sig_str):
            logger.warning("Token signature mismatch.")
            return None

        # Decode payload
        try:
            payload_bytes = cls._b64url_decode(encoded_payload)
            payload = json.loads(payload_bytes.decode("utf-8"))
        except Exception as e:
            logger.warning("Malformed token payload: %s", e)
            return None

        # Verify expiration
        exp = payload.get("exp")
        if not exp:
            return None

        now_ts = int(datetime.now(timezone.utc).timestamp())
        if now_ts > exp:
            logger.info("Admin token expired (exp: %s, now: %s).", exp, now_ts)
            return None

        return payload


auth_service = AuthService()
