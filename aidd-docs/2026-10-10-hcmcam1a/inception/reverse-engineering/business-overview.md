# Stage 2 — Reverse Engineering: Business Overview

## 1. Executive Summary
FloodWheel is an AI-powered urban flood intelligence platform designed for flood-prone metropolitan regions, primarily Ho Chi Minh City (HCMC). The system analyzes real-time street and traffic camera feeds using Gemini Vision AI (VLRDR - Vision-Language Reasoning Depth Regression) to detect flood water, estimate flood depth levels (0-4), evaluate vehicle passability (bicycles, motorbikes, sedans, SUVs, trucks), and plot flood severity across municipal zones.

## 2. Business Problem & Motivation
- **Data Scarcity**: Previously, FloodWheel relied on a small set of pre-seeded mock cameras or manually registered RTSP/HTTP streams.
- **Municipal Coverage Needs**: Ho Chi Minh City has an extensive municipal network of approximately 800 public traffic surveillance cameras managed by the HCMC Department of Transportation (`giaothong.hochiminhcity.gov.vn`).
- **Decoupling Requirement**: Scraping, authenticating, protocol translation, and high-frequency snapshot streaming from external government infrastructure imposes distinct operational demands (session cookie renewal, rate limiting, stack parsing, SSRF safeguards, connection timeouts).
- **Architectural Driver**: Extracting camera management into a dedicated, high-performance microservice (`camera-backend`) allows independent scaling, modular provider plugins (starting with HCMC and readily expandable to Da Nang, Hanoi, Bangkok, or custom CCTV networks), and provides resilient REST APIs for the core FloodWheel backend to consume.

## 3. High-Level Stakeholders & Value
| Stakeholder | Value Proposition |
|---|---|
| **Urban Commuters & Drivers** | Real-time visual clarity and accurate flood warnings along major arterial routes across all districts of HCMC. |
| **Emergency Response & City Planners** | Comprehensive situational awareness leveraging the municipal camera network without installing expensive specialized depth sensors. |
| **Core FloodWheel Backend** | Offloads camera scraping, session management, and image caching to a specialized service, receiving standardized, sanitized camera models and snapshot streams. |
