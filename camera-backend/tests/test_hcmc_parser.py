"""Unit tests for HCMCCameraProvider parser and utilities."""

import io
from PIL import Image
import pytest
from app.providers.hcmc import HCMCCameraProvider


def test_clean_ajaxpro_response_simple():
    """Tests stack parser with standard DataTable format."""
    raw = 'new Ajax.Web.DataTable([["Col1","System.String"],["Col2","System.Int32"]],[["A",1],["B",2]])'
    cleaned = HCMCCameraProvider._clean_ajaxpro_response(raw)
    assert cleaned == '{"_dt":[[["Col1","System.String"],["Col2","System.Int32"]],[["A",1],["B",2]]]}'


def test_clean_ajaxpro_response_nested_with_strings():
    """Tests stack parser handles strings with parentheses and quotes inside cells."""
    raw = (
        'new Ajax.Web.DataTable('
        '[["Title","System.String"]],'
        '[["Ngã tư (Hàng Xanh) - Xô Viết \\"Nghệ Tĩnh\\""],["Bến Xe Miền Đông (Cổng 1)"]]'
        ')'
    )
    cleaned = HCMCCameraProvider._clean_ajaxpro_response(raw)
    assert '{"_dt":' in cleaned
    assert 'Ngã tư (Hàng Xanh) - Xô Viết \\"Nghệ Tĩnh\\"' in cleaned


def test_parse_coordinates():
    """Tests extraction of WGS84 lat and lng from POINT format."""
    shape_str = "POINT (106.71182 10.80164)"
    lat, lng = HCMCCameraProvider._parse_coordinates(shape_str)
    assert lat == 10.80164
    assert lng == 106.71182

    # None and malformed strings
    assert HCMCCameraProvider._parse_coordinates(None) == (None, None)
    assert HCMCCameraProvider._parse_coordinates("INVALID") == (None, None)


def test_generate_mock_frame():
    """Tests synthetic fallback frame generation produces valid JPEG image."""
    img_bytes = HCMCCameraProvider.generate_mock_frame("CAM_TEST_01", "Test Location")
    assert isinstance(img_bytes, bytes)
    assert len(img_bytes) > 500

    # Validate image header with Pillow
    img = Image.open(io.BytesIO(img_bytes))
    assert img.format == "JPEG"
    assert img.size == (640, 360)
