# FloodWheel — Technology Stack: Map Layer

| Component | Technology | Rationale |
|---|---|---|
| **UI Framework** | Next.js 14.2 / React 18 | Current frontend stack with React Server Components and SSR. |
| **Interactive Map Engine** | Leaflet 1.9+ | Battle-tested, lightweight (~40KB), zero-dependency, open-source mapping engine. |
| **Clustering Engine** | `leaflet.markercluster` (or supercluster) | Fast spatial indexing and animated clustering for thousands of markers. |
| **Tile Layer Provider** | CartoDB Positron / OpenStreetMap | Clean, high-contrast, dark/light-friendly cartography requiring zero API keys. |
| **Icons & Styling** | `lucide-react`, Tailwind CSS 3.4 | Standard FloodWheel design system (CCTV icons, pulse markers, status badges). |
| **Data Fetching** | Native `fetch` with Next.js state | Consumes `/api/v1/cameras` and `/api/v1/cameras/{id}/snapshot`. |
