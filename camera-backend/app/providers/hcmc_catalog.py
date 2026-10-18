"""Response parser and converter for HCMC AjaxPro search queries."""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List

from app.models.camera import CameraDTO
from app.providers.hcmc_parser import HCMCParser

logger = logging.getLogger("camera_service.hcmc_catalog")


class HCMCCatalogParser:
    """Parses AjaxPro SearchQuery responses into CameraDTO list."""

    @staticmethod
    def parse_cameras_response(raw_text: str, provider_name: str, city: str) -> List[CameraDTO]:
        """Parses SearchQuery AjaxPro response into CameraDTO records."""
        cleaned_json = HCMCParser.clean_ajaxpro_response(raw_text)
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
            cam_raw: Dict[str, Any] = dict(zip(columns, row))
            lat, lng = None, None
            loc = cam_raw.get("Location")
            if isinstance(loc, dict) and "_dt" in loc:
                loc_cols = [c[0] for c in loc["_dt"][0]]
                loc_rows = loc["_dt"][1]
                if loc_rows:
                    loc_dict = dict(zip(loc_cols, loc_rows[0]))
                    lat, lng = HCMCParser.parse_coordinates(loc_dict.get("Shape"))

            cam_id = str(cam_raw.get("CamId") or "")
            if not cam_id:
                continue

            name = str(
                cam_raw.get("DisplayName")
                or cam_raw.get("Title")
                or cam_raw.get("Code")
                or cam_id
            ).strip()

            cameras.append(
                CameraDTO(
                    id=cam_id,
                    provider=provider_name,
                    city=city,
                    name=name,
                    code=cam_raw.get("Code"),
                    district=cam_raw.get("Disctrict") or cam_raw.get("District"),
                    latitude=lat,
                    longitude=lng,
                    status=str(cam_raw.get("CamStatus") or "UNKNOWN").upper(),
                    camera_type=cam_raw.get("CamType") or "PTZ",
                    snapshot_url=f"/api/v1/cameras/{cam_id}/snapshot",
                    last_synced_at=now,
                )
            )

        return cameras
