"""Unit tests for ImageValidator."""

import hashlib
import os
from pathlib import Path
import unittest

from app.services.image_validator import ImageValidator


class TestImageValidator(unittest.TestCase):
    """Test suite for image validation logic."""

    def setUp(self):
        self.sample_error_path = Path(__file__).parent.parent / "sample_error_snapshot.jpeg"

    def test_sample_error_snapshot_detected(self):
        """Verifies the real-world sample error image is identified as an error banner."""
        self.assertTrue(self.sample_error_path.exists(), "Sample error file must exist")
        data = self.sample_error_path.read_bytes()

        self.assertTrue(ImageValidator.is_error_placeholder(data))
        self.assertFalse(ImageValidator.is_valid_snapshot(data))

    def test_md5_and_sha256_detection(self):
        """Verifies detection by exact hash."""
        # Simulated payload matching known error MD5
        sample_bytes = self.sample_error_path.read_bytes()
        self.assertEqual(hashlib.md5(sample_bytes).hexdigest(), "9653ea117b2c39d4c477b0949f95860e")
        self.assertEqual(
            hashlib.sha256(sample_bytes).hexdigest(),
            "44246c5dfb69d91cffde872630d789488bf0e603ceda9c53b1984185aec4ffba",
        )
        self.assertTrue(ImageValidator.is_error_placeholder(sample_bytes))

    def test_empty_and_undersized_payloads(self):
        """Empty or tiny responses (<500 bytes) must be flagged as invalid."""
        self.assertTrue(ImageValidator.is_error_placeholder(b""))
        self.assertTrue(ImageValidator.is_error_placeholder(b"tiny"))
        self.assertFalse(ImageValidator.is_valid_snapshot(b""))
        self.assertFalse(ImageValidator.is_valid_snapshot(b"short response"))

    def test_small_png_disguised_as_snapshot(self):
        """Small PNG under 6000 bytes must be treated as placeholder."""
        png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 2000
        self.assertTrue(ImageValidator.is_error_placeholder(png_data))
        self.assertFalse(ImageValidator.is_valid_snapshot(png_data))

    def test_valid_jpeg_payload(self):
        """Valid JPEG stream should be accepted."""
        # Standard JPEG SOI marker followed by payload bytes
        jpeg_data = b"\xff\xd8\xff\xe0" + b"\x00" * 4000
        self.assertFalse(ImageValidator.is_error_placeholder(jpeg_data))
        self.assertTrue(ImageValidator.is_valid_snapshot(jpeg_data))

    def test_matches_known_error_hash(self):
        """Verifies matches_known_error_hash correctly detects known MD5 and SHA256 hashes."""
        sample_bytes = self.sample_error_path.read_bytes()
        self.assertTrue(ImageValidator.matches_known_error_hash(sample_bytes))

        # Check explicit MD5 '9653ea117b2c39d4c477b0949f95860e'
        self.assertIn("9653ea117b2c39d4c477b0949f95860e", ImageValidator.KNOWN_ERROR_MD5)

        # Check normal image does not match
        normal_jpeg = b"\xff\xd8\xff\xe0" + b"\x12\x34" * 1000
        self.assertFalse(ImageValidator.matches_known_error_hash(normal_jpeg))

    def test_dynamic_known_error_hashes_from_env(self):
        """Verifies extra hashes from ENV are incorporated."""
        custom_data = b"custom-mock-error-frame-data-12345"
        custom_md5 = hashlib.md5(custom_data).hexdigest()

        self.assertFalse(ImageValidator.matches_known_error_hash(custom_data))

        os.environ["KNOWN_ERROR_MD5"] = custom_md5
        try:
            self.assertTrue(ImageValidator.matches_known_error_hash(custom_data))
        finally:
            del os.environ["KNOWN_ERROR_MD5"]


if __name__ == "__main__":
    unittest.main()
