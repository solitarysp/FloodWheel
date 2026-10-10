# Stage 6 — Application Design: Inter-Unit Interface Definitions

## 1. OpenAPI 3.1 Contract for `camera-backend`

### Schemas

```yaml
components:
  schemas:
    CameraDTO:
      type: object
      required:
        - id
        - provider
        - city
        - name
        - latitude
        - longitude
        - status
      properties:
        id:
          type: string
          example: "662b86c41afb9c00172dd31c"
        provider:
          type: string
          example: "hcmc"
        city:
          type: string
          example: "hcmc"
        name:
          type: string
          example: "Ngã tư Hàng Xanh"
        code:
          type: string
          nullable: true
          example: "CAM_HX_01"
        district:
          type: string
          nullable: true
          example: "Bình Thạnh"
        latitude:
          type: number
          format: float
          example: 10.80164
        longitude:
          type: number
          format: float
          example: 106.71182
        status:
          type: string
          enum: ["UP", "DOWN", "MAINTENANCE"]
          example: "UP"
        has_ptz:
          type: boolean
          example: true
        snapshot_url:
          type: string
          example: "/api/v1/cameras/662b86c41afb9c00172dd31c/snapshot"
        live_video_url:
          type: string
          nullable: true
        last_synced_at:
          type: string
          format: date-time

    CameraListResponse:
      type: object
      required:
        - total
        - limit
        - offset
        - items
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer
        items:
          type: array
          items:
            $ref: '#/components/schemas/CameraDTO'
```

### Endpoints
- `GET /api/v1/cameras`: returns `CameraListResponse`.
- `GET /api/v1/cameras/{id}`: returns `CameraDTO` or 404.
- `GET /api/v1/cameras/{id}/snapshot`: returns `image/jpeg`.
- `POST /api/v1/providers/{provider_name}/sync`: returns sync telemetry JSON.
- `GET /api/v1/health`: returns health JSON.
