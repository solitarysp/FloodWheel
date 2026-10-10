"""Image validation engine for camera snapshot payloads.

Detects municipal error placeholder banners ('IMAGE NOT AVAILABLE'),
header mismatches, and corrupted or truncated frame payloads.
"""

import hashlib
import logging
from typing import Set

logger = logging.getLogger("camera_service.validator")


class ImageValidator:
    """Multi-factor image payload validator."""

    # Exact hash signatures of known municipal error banners
    KNOWN_ERROR_MD5: Set[str] = {
        "9653ea117b2c39d4c477b0949f95860e",
    }
    KNOWN_ERROR_SHA256: Set[str] = {
        "44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba",
    }

    # Binary magic headers
    PNG_MAGIC: bytes = b"\x89PNG\r\n\x1a\n"
    JPEG_MAGIC: bytes = b"\xff\xd8"

    # Thresholds
    MIN_VALID_SIZE_BYTES: int = 500
    MAX_ERROR_PNG_SIZE_BYTES: int = 6000

    @classmethod
    def is_error_placeholder(cls, data: bytes) -> bool:
        """Determines whether a payload is a municipal error placeholder banner.

        Returns True if:
        1. Payload is empty or below minimum valid payload size (< 500 bytes).
        2. Exact MD5 or SHA256 matches known error banner checksums.
        3. Header is a PNG file under 6,000 bytes (HCMC CCTV feeds serve JPEGs;
           error banners are small PNGs disguised with .ashx or .jpeg extensions).
        """
        if not data or len(data) < cls.MIN_VALID_SIZE_BYTES:
            return True

        # Factor 1: Exact MD5 match
        md5_digest = hashlib.md5(data).hexdigest()
        if md5_digest in cls.KNOWN_ERROR_MD5:
            logger.warning("Detected error banner via MD5 match: %s", md5_digest)
            return True

        # Factor 2: Exact SHA256 match
        sha256_digest = hashlib.sha256(data).hexdigest()
        if sha256_digest in cls.KNOWN_ERROR_SHA256:
            logger.warning("Detected error banner via SHA256 match: %s", sha256_digest)
            return True

        # Factor 3: PNG format on snapshot feed with small payload size
        if data.startswith(cls.PNG_MAGIC) and len(data) <= cls.MAX_ERROR_PNG_SIZE_BYTES:
            logger.warning(
                "Detected error banner via small PNG payload (%d bytes)", len(data)
            )
            return True

        return False

    @classmethod
    def is_valid_snapshot(cls, data: bytes) -> bool:
        """Returns True if the payload is a valid camera snapshot frame."""
        if cls.is_error_placeholder(data):
            return False

        # Verify it has valid image magic headers (JPEG or standard PNG)
        if not (data.startswith(cls.JPEG_MAGIC) or data.startswith(cls.PNG_MAGIC)):
            logger.warning("Payload does not start with valid image magic bytes.")
            return False

        return True
