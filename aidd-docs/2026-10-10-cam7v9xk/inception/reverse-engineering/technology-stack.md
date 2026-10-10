# Stage 2: Reverse Engineering — Technology Stack

## System Tech Stack & Integration Matrix

| Layer | Technology | Version | Purpose in Public Camera Feature |
|---|---|---|---|
| **Frontend Framework** | Next.js (React) | 14.2+ | Pages router, Server/Client components, SSR & client state management. |
| **Styling** | Tailwind CSS & Lucide Icons | 3.4+ / Lucide React | Modern dark/light UI, responsive grid, camera icons, loading spinners. |
| **Backend Framework** | FastAPI | 0.110+ | Asynchronous REST API, image streaming, proxy endpoints. |
| **HTTP Client** | HTTPX (AsyncClient) | 0.27+ | High-throughput asynchronous HTTP frame streaming from external camera feeds. |
| **AI Inference** | Google Gemini Vision API | `gemini-3.8-flash` | Multimodal VLRDR flood depth estimation, reasoning generation, landmark extraction. |
| **Database** | PostgreSQL + PostGIS | 16-3.4 | Geospatial camera registry, zone boundaries, flood reading history. |
| **Cache & Pub/Sub** | Redis | 7.0-alpine | Snapshot frame cache, camera status heartbeat cache, real-time event broadcasting. |
