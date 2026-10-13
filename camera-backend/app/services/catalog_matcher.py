"""Camera matching and filtering helper for CatalogService."""

from app.models.camera import CameraDTO, CameraFilterQuery


class CameraFilterMatcher:
    """Evaluates whether camera items match query filter parameters."""

    @staticmethod
    def matches_filter(cam: CameraDTO, q: CameraFilterQuery) -> bool:
        """Evaluates whether a camera matches query filters."""
        if q.city and cam.city.lower() != q.city.lower():
            return False

        if q.status and q.status.upper() != "ALL":
            if cam.status.upper() != q.status.upper():
                return False

        if q.district:
            q_dist = q.district.lower().strip()
            cam_dist = (cam.district or "").lower()
            if q_dist not in cam_dist:
                return False

        if q.keyword:
            kw = q.keyword.lower().strip()
            target_text = f"{cam.name} {cam.code or ''} {cam.district or ''}".lower()
            if kw not in target_text:
                return False

        if q.bbox:
            # Format: min_lat,min_lng,max_lat,max_lng
            try:
                parts = [float(x.strip()) for x in q.bbox.split(",")]
                if len(parts) == 4 and cam.latitude is not None and cam.longitude is not None:
                    min_lat, min_lng, max_lat, max_lng = parts
                    if not (min_lat <= cam.latitude <= max_lat and min_lng <= cam.longitude <= max_lng):
                        return False
            except (ValueError, IndexError):
                pass

        return True
