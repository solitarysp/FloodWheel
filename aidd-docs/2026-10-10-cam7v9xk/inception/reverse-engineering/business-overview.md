# Stage 2: Reverse Engineering — Business Overview

## Product Vision & Extension Scope
FloodWheel is an urban flood depth monitoring platform that uses traffic camera imagery and Gemini Vision AI with Visual Landmark Relative Depth Reasoning (VLRDR) to calculate water depths in centimeters without submerged hardware sensors.

### The New Feature Objective
The user requested:
> "tôi muốn kết nối đến một số camera công khai để thực hiện xem sau. Có một nút bấm để thực hiện chụp ảnh camera rồi phân tích"
> *(I want to connect to some public cameras for later viewing. Have a button to capture a snapshot of the camera and then analyze it)*

### Business Value & Impact
1. **Zero-Hardware Expansion**: Enables municipal agencies, traffic controllers, and the public to tap directly into existing public camera networks (e.g. Ho Chi Minh City traffic cameras at `giaothong.hochiminhcity.gov.vn` and open stream endpoints) without installing specialized sensors.
2. **On-Demand AI Inspection**: Rather than relying only on scheduled batch jobs, operators can visually inspect live camera feeds and click **"Capture & Analyze"** to immediately invoke Gemini Vision VLRDR on the latest frame.
3. **Instant Situational Awareness**: The analysis immediately translates visual landmarks (motorcycle wheels, exhaust pipes, curbs) into exact centimeter depth, calculates vehicle passability, alerts emergency dispatchers, and updates the city flood heatmap.
4. **Extensibility**: Users and operators can register new custom public camera URLs (HTTP snapshots / HLS live feeds) to expand monitoring to critical neighborhood flood spots.
