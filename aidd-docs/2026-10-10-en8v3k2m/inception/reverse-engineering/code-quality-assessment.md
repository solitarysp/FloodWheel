# FloodWheel — Code Quality & Localization Assessment

## 1. Architectural Strengths
- **Modular Design**: Clear separation of concerns between API routers, domain services, data models, and presentation components.
- **Async Execution**: End-to-end non-blocking operations across camera pulling, Gemini API requests, and PostgreSQL spatial transactions.
- **Fail-Safe Fallbacks**: Fallback mechanism gracefully degrades from Gemini 3.8 Flash to 2.5 Flash and synthetic mock testing during offline execution.
- **Rate Limiting & Observability**: Standard Prometheus metrics and IP token-bucket rate limiters protect the system from abusive traffic.

## 2. Localization Gaps & Risks Identified
- **Direct String Hardcoding**: Frontend components hardcode UI copy directly in JSX without an i18n abstraction dictionary.
  - *Mitigation*: Replace hardcoded Vietnamese strings with idiomatic English phrasing across all components while preserving Tailwind layouts.
- **Bilingual Prompts & Mixed Model Output**: Prompt instructions in `VLRDRPromptBuilder` currently mention *"Vietnamese or English"*, causing the model to produce Vietnamese reasoning strings.
  - *Mitigation*: Update `VLRDRPromptBuilder` to explicitly require English reasoning and English alert messages.
- **Seed Data Geographies**: Seed database zones (`seed_data.py`) use Vietnamese zone names and camera descriptions.
  - *Mitigation*: Translate zone names and camera locations to standardized English equivalents while keeping geographic coordinates (`lat`, `lng`) unchanged.
- **Service Alert Templates**: Hardcoded Vietnamese strings in `threshold_monitor.py`, `route_scorer.py`, `zone_aggregator.py`, and `flood_reading_parser.py`.
  - *Mitigation*: Convert all backend message templates and detour warnings to standard English.

## 3. Test Coverage & Quality Score
- **Unit Tests**: Full suites covering prompt generation, reading parsing, deduplication guard, route scoring, and weather client.
- **Integration Tests**: Health endpoints and FastAPI route testing.
- **Load Testing**: Locust suite for stress testing.
- **Overall Code Quality Rating**: **A- (High Quality, Ready for Localization Refactoring)**.
