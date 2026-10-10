# FloodWheel — Business Overview

## 1. Domain & Context
FloodWheel is a smart urban flood and traffic monitoring platform for Ho Chi Minh City (HCMC). Urban commuters, emergency response teams, and city planners rely on real-time visual CCTV feeds during heavy monsoon rains and tidal surges to evaluate flooded streets and impassable intersections.

## 2. Business Problem
When querying municipal traffic cameras (hosted by the Department of Transport of Ho Chi Minh City via `giaothong.hochiminhcity.gov.vn:8007`), certain camera endpoints periodically fail to provide live footage due to hardware dropouts, network congestion, or scheduled maintenance. In these cases, the municipal server returns a static error image: a 290x183 PNG banner with gray text reading `"IMAGE NOT AVAILABLE"` and an alert triangle icon.

Currently:
1. The `camera-backend` treats HTTP 200 responses as valid regardless of image payload contents, caching the `"IMAGE NOT AVAILABLE"` banner in Redis and forwarding it to downstream users.
2. Users navigating flooded streets see a blank error banner instead of the last known physical state of the intersection.
3. Every snapshot request triggers repeated external requests to municipal servers when Redis TTL expires, without retaining a local persistent history.

## 3. Desired Business Outcome
1. **Intelligent Error Shielding**: The camera service must recognize `"IMAGE NOT AVAILABLE"` placeholder banners and reject them as invalid feed data.
2. **Persistent Historical Snapshot Storage**: Every successfully fetched valid snapshot must be saved to local disk storage (`storage/snapshots/{camera_id}.jpg`).
3. **Resilient Last-Known-Good Fallback**: When an upstream municipal camera serves an error placeholder or goes offline, FloodWheel automatically serves the camera's latest valid stored image from disk. If no disk record exists for that camera, it returns a synthetic CCTV fallback frame.
4. **Sub-Millisecond Read Performance**: Serving from local disk / cache eliminates unnecessary external roundtrips and handles surges in user traffic during storm events.
