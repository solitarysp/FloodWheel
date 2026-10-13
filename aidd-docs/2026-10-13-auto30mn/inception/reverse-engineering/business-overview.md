# Business Overview — FloodWheel

## Executive Summary
FloodWheel is a smart urban flood intelligence and monitoring platform designed to transform traffic camera feeds into real-time flood depth maps, alerts, and safe routing guidance across Ho Chi Minh City. By combining municipal CCTV ingestion with Google Gemini Multimodal Vision AI using the Visual Landmark Relative Depth Ratio (VLRDR) methodology, FloodWheel detects standing water, estimates water depth in centimeters (Levels 0 through 5), and alerts municipal operators and citizens to hazardous inundations.

## Current Problem Statement
1. **Inoperable Scheduled AI Analysis**: The automated 30-minute background scanning queue frequently fails to start or becomes non-responsive. If `FLOOD_QUEUE_AUTO_START` is disabled in configuration, manual trigger requests from the admin portal fail to launch the background task. Unexpected runtime errors leave camera IDs locked in the deduplication cache, effectively freezing subsequent polling rounds.
2. **Extreme Slowness & Quota Inefficiency**: Polling cycles experience severe artificial latency caused by duplicated sleep intervals (both inside `GeminiClient` rate-limiting lock and within `FloodAnalysisQueue` worker loop). Serialized HTTP snapshot retrieval with excessive 10-second timeouts compounds the delay, while repetitive scanning of the same 15 cameras starves the remaining ~800 traffic cameras in the city.
3. **Admin Visibility Gap**: Municipal administrators lack real-time visibility into active scan cycles. The current dashboard lacks progress percentages, active camera previews, categorized success/failure/flood counters, and countdown clocks to the next scheduled cycle.

## Business Objectives
- **Reliable Continuous Monitoring**: Ensure the 30-minute automated analysis cycle runs uninterrupted, self-heals from network or quota faults, and reliably starts upon manual trigger even if initially inactive.
- **High-Throughput, Low-Latency Analysis**: Accelerate per-cycle execution by 60–75% by eliminating redundant delays, enforcing bounded-concurrency snapshot retrieval, and intelligently pacing AI inferences.
- **Fair City-Wide Coverage**: Implement fair rotation based on least-recently-polled timestamps so that all monitored districts and intersections receive periodic flood assessments.
- **Complete Administrative Telemetry**: Provide a comprehensive administrative dashboard showing real-time scanning progress, current camera telemetry, countdown timers, cycle history, and manual override controls.
