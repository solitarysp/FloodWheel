# Stage 2: Reverse Engineering — Dependencies

## Dependency Verification & Compatibility Analysis

### Backend (`backend/requirements.txt`)
- `fastapi`, `uvicorn`: API routing and ASGI streaming.
- `httpx`: Already present for weather client; ideally suited for asynchronous camera frame proxying.
- `google-genai` / `google-generativeai`: Gemini Vision multimodal client.
- `sqlalchemy`, `asyncpg`, `geoalchemy2`: Camera metadata ORM and spatial queries.
- `pillow`: For image format validation and thumbnail resizing if needed.
- **New Dependency Required**: None. All required libraries are already installed and tested in the container environment.

### Frontend (`frontend/package.json`)
- `react`, `react-dom`, `next`: Modern React components.
- `lucide-react`: Camera, Video, RefreshCw, ZoomIn, Eye, Sparkles icons.
- `tailwindcss`: Utility CSS styling for video grids and overlays.
- **New Dependency Required**: None. Existing UI packages cover all required elements.
