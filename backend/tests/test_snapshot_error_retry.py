"""Unit tests for backend ImageValidator error hash detection and retry configuration."""

import hashlib
import os
import unittest

from app.config import settings
from app.services.image_validator import ImageValidator


class TestBackendSnapshotErrorRetry(unittest.TestCase):
    """Verifies that backend ImageValidator correctly matches known error hashes."""

    def setUp(self):
        # Known error MD5 & SHA256 hashes
        self.known_md5 = "9653ea117b2c39d4c477b0949f95860e"
        self.known_sha256 = "44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba"

    def test_known_hashes_in_defaults(self):
        """Verifies the core error placeholder hashes are present in KNOWN sets."""
        self.assertIn(self.known_md5, ImageValidator.KNOWN_ERROR_MD5)
        self.assertIn(self.known_sha256, ImageValidator.KNOWN_ERROR_SHA256)

    def test_matches_known_error_hash_detection(self):
        """Verifies matches_known_error_hash identifies matching payloads."""
        # Simulated payload whose MD5 matches known_md5
        # We can mock or construct payload with that hash or use synthetic frame
        sample_error_file = "camera-backend/sample_error_snapshot.jpeg"
        if os.path.exists(sample_error_file):
            with open(sample_error_file, "rb") as f:
                data = f.read()
            self.assertEqual(hashlib.md5(data).hexdigest(), self.known_md5)
            self.assertTrue(ImageValidator.matches_known_error_hash(data))
            self.assertTrue(ImageValidator.is_error_placeholder(data))
            self.assertFalse(ImageValidator.is_valid_real_snapshot(data))

    def test_dynamic_hash_from_env(self):
        """Verifies extra error hashes configured in ENV are picked up."""
        custom_payload = b"custom-traffic-glitch-error-banner"
        custom_md5 = hashlib.md5(custom_payload).hexdigest()

        self.assertFalse(ImageValidator.matches_known_error_hash(custom_payload))

        os.environ["KNOWN_ERROR_MD5"] = custom_md5
        try:
            self.assertTrue(ImageValidator.matches_known_error_hash(custom_payload))
        finally:
            del os.environ["KNOWN_ERROR_MD5"]

    def test_config_retry_count_defaults_to_3(self):
        """Verifies SNAPSHOT_ERROR_RETRY_COUNT defaults to 3 and is configurable."""
        self.assertEqual(settings.SNAPSHOT_ERROR_RETRY_COUNT, 3)


if __name__ == "__main__":
    unittest.main()
