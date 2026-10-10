# FloodWheel — Application Design: Context Map

## 1. Bounded Contexts
FloodWheel comprises four bounded contexts interacting through well-defined English data contracts:

```
┌─────────────────────────────────────────────────────────────┐
│                   INFERENCE BOUNDED CONTEXT                 │
│  - GeminiClient                                             │
│  - VLRDRPromptBuilder                                       │
│  - FloodReadingParser                                       │
│  [Produces English FloodReading: depth, reasoning, alert]   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   TELEMETRY BOUNDED CONTEXT                 │
│  - CameraRegistry & FramePuller                             │
│  - ZoneAggregator                                           │
│  - HeatmapBuilder                                           │
│  - ThresholdMonitor & DeduplicationGuard                    │
│  [Produces English GeoJSON FeatureCollection & Red Alerts]  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   NAVIGATION & ROUTING CTX   │ │  ADMIN & OPERATOR CONTEXT  │
│  - RouteScorer               │ │  - ZoneOverrideService     │
│  - Detour Advisor            │ │  - PollingTriggerService   │
│  [Produces English Scores    │ │  [Produces English Manual  │
│   and Detour Warnings]       │ │   Override States]         │
└──────────────────────────────┘ └────────────────────────────┘
```

## 2. Shared Kernel & English Ubiquitous Language
- **Depth Scale Levels**:
  - `Level 0: Dry (0cm)`
  - `Level 1: Minor (5–15cm)`
  - `Level 2: Caution (15–30cm)`
  - `Level 3: Danger / Impassable for 2-Wheelers (30–45cm)`
  - `Level 4: Severe / Sedans Stalled (45–70cm)`
  - `Level 5: Catastrophic (>70cm)`
- **Landmark Taxonomy**:
  - `Motorcycle rear wheel rim`, `Exhaust pipe tip`, `Sedan rocker panel / door sill`, `Sidewalk curb (15cm)`.
