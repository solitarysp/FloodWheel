# FloodWheel — Requirements Verification Questions

## Question 1: System-Wide Scope of English Conversion
What is the target depth and breadth of the English translation across FloodWheel?

A) Frontend UI only (leave backend API responses and AI model prompts untouched)  
B) Full Stack English Localization: Frontend UI components, pages, metadata, backend alert templates, route detour advisories, Gemini Vision prompt instructions, and seed data  
C) Maintain dual-language toggle (i18n runtime dictionary switcher)  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: The user explicitly requested: "web đang tiếng việt. Hãy chỉnh sửa để web và mọi thứ là tiếng anh" ("the web is currently in Vietnamese. Please edit so that the web and everything is in English"). A full-stack English localization ensures consistency across the entire user experience: when an international evaluator clicks "Analyze" on the web, the AI reasoning, alert messages, and route safety score returned by the API will all be natively rendered in English.

---

## Question 2: Geographical & Landmark Naming Strategy
How should local Vietnamese road names, districts, and urban landmarks in the demo and seed database be represented?

A) Preserve full Vietnamese diacritic spelling (e.g., "Nguyễn Hữu Cảnh", "Quận Bình Thạnh")  
B) Standardized English Transliteration with Contextual Descriptors (e.g., "Nguyen Huu Canh Corridor (Thu Thiem Bridge - The Manor)", "Binh Thanh District", "Ben Thanh Market")  
C) Replace all locations with fictional or Western locations  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Using clean transliterated street names paired with English descriptors (Corridor, Incline, Market, District) maintains real-world authenticity and spatial accuracy in Ho Chi Minh City while being effortlessly readable and pronouncable by international stakeholders, investors, and judges.

---

## Question 3: Gemini Vision Model Language Enforcement
How should the prompt engineering in `VLRDRPromptBuilder` guide Gemini 3.8 Flash regarding output language?

A) Permit bilingual output (English or Vietnamese) as previously specified  
B) Strictly enforce English responses in both `reasoning` and `alert_message` attributes within the system instruction and output schema definition  
C) Post-process and machine-translate Gemini outputs on the server  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Directly prompting Gemini 3.8 Flash to reason and output strictly in English is zero-latency, requires zero external translation dependencies, and yields superior, natural technical English describing vehicle landmark contact points (e.g., "exhaust pipe submerged", "wheel rim half covered").

---

## Question 4: Benchmark Dataset Localization
How should the 12 curated demo scenarios in `frontend/data/benchmarkDataset.ts` be handled?

A) Keep existing Vietnamese descriptions  
B) Fully translate all scenario titles, location tags, and visual landmark bullet points to idiomatic English  
C) Remove the benchmark dataset and only support live camera uploads  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: The preset benchmark scenarios are critical for instant 3-minute hackathon and jury demonstrations. Having full English titles, locations, and landmark bullet points ensures that users testing preset images clearly understand the visual clues being measured by Gemini.

---

## Question 5: Navigation & Vehicle Passability Terminology
What terminology should be standardized for vehicle passability and emergency alerts?

A) Retain raw centimeters only without vehicle context  
B) Use standardized automotive and civic mobility English terms: "Passable for all vehicles", "Caution for two-wheelers", "Impassable for motorcycles (exhaust submerged)", "Severe flood / Impassable for sedans", "Detour recommended"  
X) Other (write your explanation after the [Answer]: tag)

[Answer]: B
**Rationale**: Standardized mobility terminology matches the user personas for delivery dispatchers (Grab, ShopeeFood) and municipal flood monitoring centers, translating technical depth measurements into immediate, life-saving operational decisions.
