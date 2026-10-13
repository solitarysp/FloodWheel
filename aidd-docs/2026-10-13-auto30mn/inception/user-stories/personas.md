# Personas — Automated 30-Minute AI Analysis & Admin Monitor

## Persona 1: Minh — Senior Municipal Traffic & Flood Operations Specialist
- **Role**: Lead Administrator, Ho Chi Minh City Urban Flood & Traffic Control Center.
- **Context**: Responsible for monitoring ~800 traffic cameras across 24 districts during heavy monsoon storms and high tide events.
- **Pain Points**:
  - The background AI analysis appears frozen or dead; triggering "Quét Ngay Lập Tức" does not produce feedback.
  - Runs take way too long (>3 minutes) for only 15 cameras, and repeatedly test the exact same cameras in District 1 rather than surveying vulnerable outer areas (Binh Thanh, Thu Duc, District 7).
  - The admin interface doesn't reveal whether a scan is currently running, how much has finished, or when the next scan will start.
- **Goals**:
  - Needs a dependable, self-healing background system that reliably assesses cameras every 30 minutes.
  - Wants a live command console displaying progress bars, active camera thumbnails, and a countdown to the next automated round.
  - Wants full control to pause or trigger scans on demand.

---

## Persona 2: Tu — City Commuter & Dispatch Coordinator
- **Role**: Daily motor vehicle commuter and logistics dispatcher.
- **Context**: Relies on FloodWheel's live public map and safe routing engine to steer delivery riders and commuters away from severely flooded streets.
- **Pain Points**:
  - Outdated flood readings on the public map because the 30-minute automated queue broke or starved their local district's cameras.
- **Goals**:
  - Accurate, continuously refreshed flood readings across all city routes so travel advisories stay up to date.
