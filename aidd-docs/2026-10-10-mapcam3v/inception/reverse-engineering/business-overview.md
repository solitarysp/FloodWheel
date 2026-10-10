# FloodWheel — Business Overview: Camera Map Visualization

## 1. Executive Summary
FloodWheel connects citizens, emergency responders, and traffic coordinators to real-time urban flood conditions across Ho Chi Minh City. By monitoring over 800 municipal CCTV cameras operated by the Department of Transport, the platform detects localized standing water and flooded streets without dedicated in-ground sensors.

## 2. Current Business Problem
While the backend infrastructure successfully ingests, manages, caches, and persists real-time snapshots for ~800 traffic cameras:
1. **Lack of Geographic Intuition**: On `/cameras`, cameras are rendered in a vertical card grid. A commuter navigating from District 1 to Thu Duc City has no quick way to inspect cameras along their route without manually reading street names and district labels.
2. **Excessive Scrolling and Navigation Friction**: Browsing hundreds of camera cards degrades browser rendering performance and creates cognitive overload.
3. **Disconnected Map**: The existing `FloodMap.tsx` component is an SVG mockup displaying four historical flood zones, completely separated from the live camera network.

## 3. Desired Business Outcomes
1. **Interactive Spatial Exploration**: Users see all CCTV cameras plotted across Ho Chi Minh City on an interactive map with zoom, pan, and district bounds.
2. **Marker Clustering**: Large densities of nearby cameras group into cluster badges (e.g. "+12", "+35") that cleanly expand on zoom, ensuring smooth 60fps interaction and zero visual clutter.
3. **Instant Snapshot Inspection Drawer/Popup**: Clicking a camera pin reveals its live snapshot feed, camera angle, district, status, and a one-click trigger for Gemini AI flood depth analysis.
4. **Dual View Flexibility**: Users switch between a Full Map View 🗺️ and the Grid View 🔲 with one toggle button, preserving filter states (search, district, online status).
