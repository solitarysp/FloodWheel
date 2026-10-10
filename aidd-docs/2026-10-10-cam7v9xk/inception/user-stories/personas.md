# Stage 4: User Stories — Personas

## Target Personas for Public Camera Monitoring & Instant Analysis

### Persona 1: Municipal Flood Monitoring Operator (Bao Nguyen)
- **Role**: Operations Center Officer, Ho Chi Minh City Flood Management Center
- **Goal**: Rapidly survey multiple CCTV cameras across known flood-prone corridors (e.g. Nguyen Huu Canh, Vo Van Ngan) during monsoon cloudbursts, immediately trigger AI depth analysis when puddles appear, and verify water accumulation before sounding alarms or dispatching mobile pumping units.
- **Pain Point**: Cannot monitor dozens of feeds manually or eyeball water height in the dark; needs a single-click AI measurement to quantify depth in centimeters.

### Persona 2: Urban Commuter & Ride-Hailing Driver (Duc Tran)
- **Role**: Daily GrabBike / Two-Wheeler Driver
- **Goal**: Check live camera snapshots of low-lying underpasses before departing on a ride, see if water has reached motorcycle exhaust pipes (~30cm), and avoid flooded bottlenecks.
- **Pain Point**: Traffic maps only show generic congestion or red lines without showing if water is deep enough to stall a scooter engine.

### Persona 3: Traffic Systems Engineer / Admin (Sarah Jenkins)
- **Role**: Municipal Smart City Systems Integrator
- **Goal**: Connect newly deployed public or ward-level camera snapshot streams to the FloodWheel system with valid GPS tags, camera angles, and zone associations.
- **Pain Point**: Integrating new camera feeds often requires custom backend code deployment and system restarts.
