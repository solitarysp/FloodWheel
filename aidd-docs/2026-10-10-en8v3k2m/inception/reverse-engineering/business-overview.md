# FloodWheel — Business Overview

## 1. Executive Summary
**FloodWheel** is a civic tech, real-time urban flood depth mapping and early-warning intelligence platform. It repurposes municipal CCTV traffic cameras into virtual flood depth sensors without deploying costly hardware probes. Using Gemini Vision AI (Gemini 3.8 Flash) and the proprietary **Visual Landmark Relative Depth Reasoning (VLRDR)** methodology, FloodWheel continuously assesses water levels against known physical landmarks on everyday urban vehicles (motorcycle wheels, exhaust tips, car door sills, curbs) across metropolitan road networks.

## 2. Problem Statement & Urban Context
- **Catastrophic Flooding**: Major Southeast Asian metropolitan areas (Ho Chi Minh City, Hanoi, Jakarta, Manila) experience frequent severe flash floods during monsoon storms and high tidal surges.
- **Data Blind Spots**: Municipal authorities, emergency dispatchers, and commuter populations operate blind regarding real-time water depths. Existing IoT water sensors are prohibitively expensive to install and maintain across thousands of kilometers of roadways.
- **Commuter Hazard**: Millions of ride-hailing couriers (Grab, ShopeeFood, Gojek) and commuters risk engine hydrolock, vehicle abandonment, and electric shock when unknowingly entering streets flooded past motorcycle exhaust pipe levels (~30–35 cm).

## 3. Product Vision & Value Proposition
- **Zero-Sensor Infrastructure**: Leverages existing public traffic cameras (e.g. 50–100 CCTV feeds in HCMC).
- **Sub-Second Depth Classification**: Classifies flood depth into 6 discrete levels (Level 0: Dry to Level 5: Catastrophic >70 cm) with centimeter ranges and confidence scores.
- **Dynamic City Heatmap & Route Safety**: Generates real-time GeoJSON flood heatmaps and scores planned routes for safe traversal.
- **Emergency Early Warning**: Dispatches automated Red Alerts (push notifications, webhooks) to municipal dashboards and delivery platforms when water exceeds safety thresholds.

## 4. Current Challenge & Localization Initiative
While the core architecture was successfully developed and tested during the initial construction cycle, all user-facing interfaces, operator dashboards, emergency warnings, routing advisories, AI reasoning explanations, and benchmark dataset annotations were initially implemented in **Vietnamese**.

To prepare FloodWheel for global deployment, international civic partner demonstrations, cross-border smart city initiatives, and hackathon showcases, this initiative transitions **all user interfaces, API messages, AI reasoning templates, demo assets, and operational logs to English**.
