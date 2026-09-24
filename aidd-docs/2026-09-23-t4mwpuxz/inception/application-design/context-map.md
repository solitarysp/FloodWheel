# FloodWheel — Context Map

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOODWHEEL SYSTEM BOUNDARY                   │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  INGESTION   │───►│  AI ANALYSIS │───►│  AGGREGATION &   │  │
│  │  CONTEXT     │    │  CONTEXT     │    │  MAPPING CONTEXT │  │
│  │              │    │              │    │                  │  │
│  │ - Cameras    │    │ - Gemini AI  │    │ - Flood Zones    │  │
│  │ - Frames     │    │ - VLRDR      │    │ - Heatmap        │  │
│  │ - Scheduler  │    │ - Readings   │    │ - GeoJSON        │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                   │             │
│  ┌──────────────────────────────────────────────  │  ────────┐  │
│  │  ALERT & NOTIFICATION CONTEXT  ◄──────────────┘          │  │
│  │                                                           │  │
│  │ - Threshold monitoring                                    │  │
│  │ - Deduplication                                           │  │
│  │ - Webhook delivery                                        │  │
│  │ - Push notifications                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  API & ACCESS CONTROL│    │  DASHBOARD / UI CONTEXT      │   │
│  │  CONTEXT             │    │                              │   │
│  │ - REST endpoints     │    │ - Operator dashboard         │   │
│  │ - Auth/Rate limiting │    │ - Public flood map           │   │
│  │ - OpenAPI spec       │    │ - Demo interface             │   │
│  └──────────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL CONTEXTS:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ City CCTV   │  │ Gemini API  │  │ Weather API │  │ Ride-hailing│
│ Camera      │  │ (Google AI) │  │(Open-Meteo) │  │ Apps (Grab) │
│ Infrastructure│ │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## Inter-Context Data Flows

| From | To | Data | Format |
|------|----|------|--------|
| Ingestion | AI Analysis | Raw frame (in-memory) | bytes (JPEG) |
| AI Analysis | Aggregation | FloodReading | Pydantic model / JSON |
| Aggregation | Alert Engine | ZoneStatus transition | Event (Redis Pub/Sub) |
| Aggregation | API Context | ZoneStatus, GeoJSON | PostgreSQL + Redis cache |
| Alert Engine | External | AlertPayload | HTTP POST (webhook), Web Push |
| API Context | Dashboard | REST JSON | HTTP/JSON + WebSocket |

## Anti-Corruption Layer

The `GeminiClient` acts as an Anti-Corruption Layer (ACL) between the AI Analysis context and the Gemini external API. It translates between:
- Internal `Frame` → Gemini multi-part API request
- Gemini raw JSON response → validated `FloodReading` Pydantic model

This isolates the rest of the system from any Gemini API changes or version upgrades.
