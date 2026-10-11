"""Ho Chi Minh City Municipal Traffic Camera Provider.

Connects to Cổng thông tin giao thông TP. Hồ Chí Minh
(https://giaothong.hochiminhcity.gov.vn) to scrape public CCTV feeds,
maintain authenticated session cookies (.VDMS), and proxy real-time snapshot images.
"""

import asyncio
from datetime import datetime, timezone
import io
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image, ImageDraw

from app.core.config import settings
from app.models.camera import CameraDTO
from app.providers.base import BaseCameraProvider
from app.services.image_validator import ImageValidator

logger = logging.getLogger("camera_service.hcmc_provider")


class HCMCCameraProvider(BaseCameraProvider):
    """Provider implementation for Ho Chi Minh City traffic cameras."""

    provider_name: str = "hcmc"
    city: str = "hcmc"

    def __init__(
        self,
        cache_service: Optional[Any] = None,
        storage_service: Optional[Any] = None,
    ):
        self.cache_service = cache_service
        self.storage_service = storage_service
        self._cookies: Dict[str, str] = {}
        self._auth_lock = asyncio.Lock()
        self._cached_cameras: Optional[List[CameraDTO]] = None
        self._last_synced_at: Optional[datetime] = None

        # Asynchronous HTTP client with connection pooling
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS, connect=5.0),
            headers={
                "User-Agent": settings.HCMC_USER_AGENT,
                "Referer": settings.HCMC_MAP_URL,
                "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
            },
            follow_redirects=True,
        )

    async def close(self):
        """Closes the underlying HTTP client."""
        if not self._client.is_closed:
            await self._client.aclose()

    async def init_session(self, force: bool = False) -> Dict[str, str]:
        """Fetches or refreshes session authentication cookies from map.aspx."""
        async with self._auth_lock:
            # Check cached cookies first if not forcing
            if not force and self.cache_service:
                cached = await self.cache_service.get_session_cookies("hcmc")
                if cached and ".VDMS" in cached:
                    self._cookies = cached
                    return self._cookies

            if not force and self._cookies and ".VDMS" in self._cookies:
                return self._cookies

            logger.info("Initializing session with HCMC portal: %s", settings.HCMC_MAP_URL)
            try:
                resp = await self._client.get(settings.HCMC_MAP_URL)
                resp.raise_for_status()

                # Extract cookies into dict
                new_cookies = dict(resp.cookies)
                for header_val in resp.headers.get_list("set-cookie"):
                    parts = header_val.split(";")[0].split("=", 1)
                    if len(parts) == 2:
                        new_cookies[parts[0].strip()] = parts[1].strip()

                self._cookies = new_cookies
                logger.info(
                    "Session established successfully. .VDMS present: %s, ASP.NET_SessionId: %s",
                    ".VDMS" in self._cookies,
                    bool(self._cookies.get("ASP.NET_SessionId")),
                )

                if self.cache_service and self._cookies:
                    await self.cache_service.set_session_cookies(
                        "hcmc",
                        self._cookies,
                        ttl=settings.SESSION_COOKIE_TTL_SECONDS,
                    )

                return self._cookies
            except Exception as exc:
                logger.error("Failed to establish HCMC portal session: %s", exc)
                return self._cookies

    @staticmethod
    def _clean_ajaxpro_response(text: str) -> str:
        """Parses AjaxPro .NET JavaScript syntax:

        `new Ajax.Web.DataTable([columns], [rows])` into valid JSON `{"_dt":
        [[columns], [rows]]}`.
        """
        tag = "new Ajax.Web.DataTable("
        tag_len = len(tag)
        res = []
        i = 0
        stack = []
        in_str = False
        escape = False
        n = len(text)

        while i < n:
            ch = text[i]
            if in_str:
                res.append(ch)
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_str = False
                i += 1
            else:
                if ch == '"':
                    in_str = True
                    res.append('"')
                    i += 1
                elif text.startswith(tag, i):
                    res.append('{"_dt":[')
                    stack.append("dt")
                    i += tag_len
                elif ch == "(":
                    res.append("(")
                    stack.append("(")
                    i += 1
                elif ch == ")":
                    if stack and stack[-1] == "dt":
                        stack.pop()
                        res.append("]}")
                    elif stack and stack[-1] == "(":
                        stack.pop()
                        res.append(")")
                    else:
                        res.append(")")
                    i += 1
                else:
                    res.append(ch)
                    i += 1
        return "".join(res)

    @staticmethod
    def _parse_coordinates(shape_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
        """Extracts latitude and longitude from 'POINT(lng lat)' format."""
        if not shape_str:
            return None, None
        match = re.search(r"POINT\s*\(\s*([\d\.]+)\s+([\d\.]+)\s*\)", shape_str)
        if match:
            try:
                lng = float(match.group(1))
                lat = float(match.group(2))
                return lat, lng
            except (ValueError, IndexError):
                pass
        return None, None

    async def get_cameras(self, force_refresh: bool = False) -> List[CameraDTO]:
        """Queries the AjaxPro FolderAjax endpoint to retrieve all ~800 public traffic cameras."""
        if self._cached_cameras is not None and not force_refresh:
            return self._cached_cameras

        # Check cookies
        if not self._cookies or ".VDMS" not in self._cookies:
            await self.init_session()

        payload = {
            "path": "/root/vdms/tangthu/data/layerdata/camera",
            "isInTree": False,
            "searchKey": "",
            "layer": ["CAMERA"],
            "detail": True,
            "page": 0,
            "limit": -1,
            "filterQuery": ["Publish:true"],
            "sortby": None,
            "returnFields": [
                "CamId", "Code", "Location", "SnapshotUrl", "CamType",
                "Disctrict", "Publish", "ManagementUnit", "CamStatus",
                "PTZ", "Angle", "DisplayName", "VideoUrl", "VideoStreaming"
            ],
        }

        headers = {
            "Content-Type": "text/plain; charset=UTF-8",
            "X-AjaxPro-Method": "SearchQuery",
        }

        # Attempt query with one auto-reauth retry
        for attempt in range(2):
            try:
                logger.info(
                    "Querying HCMC AjaxPro SearchQuery (attempt %d/2)...", attempt + 1
                )
                resp = await self._client.post(
                    settings.HCMC_AJAX_FOLDER_URL,
                    content=json.dumps(payload),
                    headers=headers,
                    cookies=self._cookies,
                    timeout=30.0,
                )
                resp.raise_for_status()

                if "User is not authenticated" in resp.text or resp.status_code in (401, 403):
                    logger.warning("HCMC session expired. Re-authenticating...")
                    await self.init_session(force=True)
                    continue

                cleaned_json = self._clean_ajaxpro_response(resp.text)
                data = json.loads(cleaned_json)

                val = data.get("value")
                if not val or len(val) < 2 or not val[1] or len(val[1]) < 2:
                    raise ValueError("Empty or malformed payload from municipal server.")

                table_node = val[1][1]
                if "_dt" not in table_node:
                    raise ValueError("DataTable token '_dt' not found in response.")

                dt_data = table_node["_dt"]
                columns = [c[0] for c in dt_data[0]]
                rows = dt_data[1]

                cameras: List[CameraDTO] = []
                now = datetime.now(timezone.utc)

                for row in rows:
                    cam_raw = dict(zip(columns, row))

                    # Location / coordinate extraction
                    lat, lng = None, None
                    loc = cam_raw.get("Location")
                    if isinstance(loc, dict) and "_dt" in loc:
                        loc_cols = [c[0] for c in loc["_dt"][0]]
                        loc_rows = loc["_dt"][1]
                        if loc_rows:
                            loc_dict = dict(zip(loc_cols, loc_rows[0]))
                            shape_str = loc_dict.get("Shape")
                            lat, lng = self._parse_coordinates(shape_str)

                    cam_id = str(cam_raw.get("CamId") or "")
                    if not cam_id:
                        continue

                    name = str(
                        cam_raw.get("DisplayName")
                        or cam_raw.get("Title")
                        or cam_raw.get("Code")
                        or cam_id
                    ).strip()
                    code = cam_raw.get("Code")
                    district = cam_raw.get("Disctrict") or cam_raw.get("District")
                    status = str(cam_raw.get("CamStatus") or "UNKNOWN").upper()
                    cam_type = cam_raw.get("CamType") or "PTZ"
                    # Proxy snapshot URL endpoint
                    snapshot_url = f"/api/v1/cameras/{cam_id}/snapshot"

                    cameras.append(
                        CameraDTO(
                            id=cam_id,
                            provider=self.provider_name,
                            city=self.city,
                            name=name,
                            code=code,
                            district=district,
                            latitude=lat,
                            longitude=lng,
                            status=status,
                            camera_type=cam_type,
                            snapshot_url=snapshot_url,
                            last_synced_at=now,
                        )
                    )

                self._cached_cameras = cameras
                self._last_synced_at = now
                logger.info("Successfully extracted %d HCMC cameras!", len(cameras))
                return cameras

            except Exception as exc:
                logger.error("HCMC camera extraction error (attempt %d): %s", attempt + 1, exc)
                if attempt == 0:
                    await self.init_session(force=True)
                else:
                    if self._cached_cameras:
                        logger.warning("Returning stale cached cameras (%d count)", len(self._cached_cameras))
                        return self._cached_cameras
                    raise

        return self._cached_cameras or []

    async def get_snapshot(
        self,
        camera_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> Tuple[bytes, str]:
        """Fetches the real-time JPEG snapshot from port 8007 CameraHandler.ashx.

        If upstream fails or returns an error banner ('IMAGE NOT AVAILABLE'),
        falls back to the last known valid image stored on disk for this camera,
        or generates a realistic synthetic frame if no prior snapshot exists.
        """
        if not self._cookies or ".VDMS" not in self._cookies:
            await self.init_session()

        url = f"{settings.HCMC_CAMERA_HANDLER_URL}?id={camera_id}&bg=black"
        if width and height:
            url += f"&w={width}&h={height}"

        for attempt in range(2):
            try:
                resp = await self._client.get(
                    url,
                    cookies=self._cookies,
                    timeout=min(settings.HTTP_TIMEOUT_SECONDS, 4.0),
                )

                if resp.status_code in (401, 403) or len(resp.content) < 50:
                    logger.warning("Snapshot 403/Forbidden for %s. Re-authenticating...", camera_id)
                    await self.init_session(force=True)
                    continue

                resp.raise_for_status()

                # Validate payload: detect 'IMAGE NOT AVAILABLE' placeholder banners
                if not ImageValidator.is_valid_snapshot(resp.content):
                    logger.warning(
                        "Upstream camera %s returned invalid or error placeholder image (%d bytes). Rejecting payload.",
                        camera_id,
                        len(resp.content),
                    )
                    break

                # Valid live frame from municipal server
                return resp.content, "live"

            except Exception as exc:
                logger.warning("Snapshot fetch attempt %d failed for %s: %s", attempt + 1, camera_id, exc)
                # Fast fallback: if we have a valid snapshot on disk, return it immediately
                if self.storage_service:
                    stored_frame = await self.storage_service.get_snapshot(camera_id)
                    if stored_frame and ImageValidator.is_valid_snapshot(stored_frame):
                        logger.info(
                            "Serving last-known-good disk fallback frame for camera %s (%d bytes)",
                            camera_id,
                            len(stored_frame),
                        )
                        return stored_frame, "disk-storage"

                if attempt == 0:
                    await self.init_session(force=True)
                else:
                    break

        # Fallback Strategy:
        # Tier 1: Check persistent disk storage for last-known-good frame
        if self.storage_service:
            stored_frame = await self.storage_service.get_snapshot(camera_id)
            if stored_frame and ImageValidator.is_valid_snapshot(stored_frame):
                logger.info(
                    "Serving last-known-good disk fallback frame for camera %s (%d bytes)",
                    camera_id,
                    len(stored_frame),
                )
                return stored_frame, "disk-storage"

        # Tier 2: Generate synthetic CCTV frame with timestamp and location overlay
        logger.info("No prior valid snapshot on disk. Generating synthetic fallback frame for %s", camera_id)
        return self.generate_mock_frame(camera_id), "synthetic"

    @classmethod
    def generate_mock_frame(cls, camera_id: str, camera_name: str = "") -> bytes:
        """Generates a high-contrast synthetic CCTV frame with timestamp and location overlay."""
        width, height = 640, 360
        img = Image.new("RGB", (width, height), color=(24, 28, 36))
        draw = ImageDraw.Draw(img)

        # Draw urban street representation (sky, road, sidewalk, flood puddle)
        draw.rectangle([(0, 0), (width, 140)], fill=(35, 42, 54))  # Sky / background
        draw.rectangle([(0, 140), (width, 160)], fill=(80, 85, 95))  # Curb line
        draw.rectangle([(0, 160), (width, height)], fill=(45, 50, 58))  # Asphalt road

        # Simulate water reflections / standing water on lower roadway
        draw.rectangle([(50, 220), (590, 320)], fill=(38, 62, 78))  # Flood pool reflection
        draw.line([(0, 220), (width, 220)], fill=(60, 95, 120), width=2)

        # Vehicle silhouette landmark (motorcycle wheels touching flood line)
        draw.ellipse([(260, 210), (310, 260)], fill=(20, 20, 20), outline=(100, 100, 100))
        draw.rectangle([(280, 170), (360, 220)], fill=(50, 55, 65))

        # CCTV OSD Header
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        osd_title = f"HCMC CCTV: {camera_name or camera_id}"

        # OSD text background bar
        draw.rectangle([(0, 0), (width, 36)], fill=(15, 18, 24))
        draw.text((12, 10), osd_title, fill=(0, 240, 160))
        draw.text((360, 10), now_str, fill=(220, 225, 230))

        # Bottom overlay bar
        draw.rectangle([(0, height - 28), (width, height)], fill=(15, 18, 24))
        draw.text(
            (12, height - 20),
            "GIAO THONG TP. HO CHI MINH — LIVE TRAFFIC MONITOR",
            fill=(180, 190, 200),
        )

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    async def health_check(self) -> Dict[str, Any]:
        """Verifies connectivity to municipal endpoints."""
        has_cookies = bool(self._cookies and ".VDMS" in self._cookies)
        return {
            "provider": self.provider_name,
            "city": self.city,
            "status": "active" if has_cookies or self._cached_cameras else "ready",
            "session_active": has_cookies,
            "cached_cameras_count": len(self._cached_cameras) if self._cached_cameras else 0,
            "last_synced_at": self._last_synced_at.isoformat() if self._last_synced_at else None,
        }
