# FloodWheel — User Personas

## Persona 1: Minh — City Traffic Control Operator

**Age:** 38 | **Location:** Ho Chi Minh City | **Role:** Traffic Management Center Operator

**Background:**
Minh works in the Ho Chi Minh City Traffic Management Center, monitoring a wall of 200+ CCTV screens. He has been dealing with annual catastrophic floods for 10 years. Currently, when it rains, he gets flooded with phone calls from the public but has no structured data about where exactly the deepest flooding is.

**Goals:**
- Know in real time which roads are passable without calling field officers
- Coordinate with emergency services efficiently
- Prove the value of existing CCTV investments to city leadership

**Pain Points:**
- "I have 200 cameras but I can't watch all of them at once during a storm"
- "By the time someone calls to report flooding, the situation has already changed"
- "I need data, not guesses"

**Behaviors:**
- Uses desktop PC primarily; occasionally a tablet in meetings
- Not highly technical but comfortable with dashboards
- Trusts visual evidence (camera thumbnails) over abstract numbers alone

**FloodWheel Use Case:** Monitor the city-wide heatmap during rainfall events, view camera thumbnails for the worst zones, coordinate blockade deployment, generate reports for city government

---

## Persona 2: Loan — ShopeeFood Delivery Driver

**Age:** 24 | **Location:** Hanoi | **Role:** Part-time delivery driver (motorcycle)

**Background:**
Loan does 30–40 deliveries per day on her Honda Air Blade. She's had her motorcycle stall three times in flooded streets, costing her days of repair and lost income. She doesn't know which streets to avoid until she's already in the water.

**Goals:**
- Avoid flooded roads before she reaches them, not after
- Complete deliveries safely and efficiently
- Protect her motorcycle from costly water damage

**Pain Points:**
- "Google Maps doesn't tell me if a road is flooded"
- "I can see other drivers stopped ahead but don't know if it's a traffic jam or flooding"
- "I lose money every time my bike breaks from water damage"

**Behaviors:**
- Uses phone-mounted GPS all day
- High data sensitivity — uses apps that are fast and minimal
- Relies on driver community groups (Zalo) for informal flood reports

**FloodWheel Use Case:** Receive real-time push notifications for flooded routes on her planned delivery path; see flood-safe alternative routes integrated in her navigation app (via Grab/ShopeeFood API integration)

---

## Persona 3: Dr. Hung — City Urban Planning Director

**Age:** 52 | **Location:** Hanoi City Hall | **Role:** Director, Department of Urban Infrastructure

**Background:**
Dr. Hung oversees the city's flood management budget. Every year he justifies millions in spending on flood infrastructure, but has no precise data on which roads flood most frequently or at what severity. He needs evidence for budget allocation and to report to city council.

**Goals:**
- Data-driven infrastructure investment (which drains to upgrade first)
- Accountability: show flood response times are improving year over year
- Justify the FloodWheel project cost to city council

**Pain Points:**
- "We spend billions on infrastructure but we don't know if it's working"
- "Journalists ask which streets flood most. I have no precise answer."
- "I need 90-day historical data to show trends, not just real-time snapshots"

**Behaviors:**
- Uses desktop only; prefers PDF reports and data exports
- Relies on subordinates to run analysis; wants summary dashboards
- Needs data for annual budget cycle (October each year)

**FloodWheel Use Case:** Access historical flood heatmaps for the past 12 months, generate zone-level frequency and severity reports, export data for GIS integration with city infrastructure maps

---

## Persona 4: Lan — First Responder / Emergency Manager

**Age:** 34 | **Location:** Ho Chi Minh City Fire & Rescue | **Role:** Emergency Response Team Leader

**Background:**
Lan commands a rescue team that deploys during severe flooding events. Her team's boats and vehicles must be positioned strategically before the worst flooding hits. Currently, she makes decisions based on vague media reports and calls from the public.

**Goals:**
- Pre-position rescue resources where flooding will be worst
- Know whether roads are passable for rescue vehicles (trucks need < 30cm)
- Coordinate with traffic management to clear access routes

**Pain Points:**
- "We always arrive after people are already stranded"
- "I need to know which areas are at 50cm+ now, not in an hour"
- "My team's trucks can't go through roads deeper than 30cm"

**Behaviors:**
- Uses smartphone in the field; desktop in command center
- Needs large text, high contrast UI in emergency conditions
- Needs offline capability when network is degraded in flood zones

**FloodWheel Use Case:** Monitor critical alerts (depth_level ≥ 3) in real time on mobile dashboard, view rescue vehicle route passability scores, coordinate resource pre-positioning based on predictive flood progression

---

## Persona 5: Alex — Hackathon Judge (Technical)

**Age:** 42 | **Location:** Singapore / Remote | **Role:** VentureCapital / Tech Lead Judge**

**Background:**
Alex evaluates dozens of hackathon projects. He's seen many AI demos that are impressive on stage but fall apart technically. He wants to understand: Is the core AI inference actually working? Is there a real market? Can this scale?

**Goals:**
- Verify that the Gemini API integration actually produces accurate results
- Understand the business model and go-to-market
- See evidence that the problem is real and the solution is differentiated

**Pain Points (as evaluator):**
- "Most demos are mockups. I want to see real AI output."
- "Anyone can claim their AI works. Show me edge cases where it struggles."
- "What's the moat? Why can't Google Maps just do this?"

**FloodWheel Use Case:** Interact with the live demo — upload real flood images and see the AI output in real time; view the city heatmap with sample data; understand the cost vs. sensor alternative
