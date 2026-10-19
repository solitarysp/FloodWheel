# FloodWheel — Solution & Deployment Summary

Team **ZeroFlood** · Leader: Le Van Thanh · Track: Sustainability & Social Impact

## Solution

FloodWheel turns a city's existing traffic CCTV cameras into centimeter-accurate flood depth gauges using Google Gemini Vision, with no new hardware. The **VLRDR** method (Visual Landmark-Referenced Depth Ratio) estimates water depth from how much of a known-size landmark (wheel, exhaust pipe, curb) is submerged, calibrated for Southeast Asian vehicles.

**Pipeline**
1. **Ingestion:** the camera service pulls live snapshots from the HCMC traffic portal (Redis cache, 2-tier fallback).
2. **Validation:** `ImageValidator` drops corrupted or fake frames before any AI call.
3. **Analysis:** Gemini returns a depth level (0–5) and min/max cm, paced at 6s (≤10 RPM) with multi-key rotation.
4. **Storage:** results go to PostGIS, with a time-decay median per zone.
5. **Distribution:** Next.js map (Map and Grid views), Level 3+ webhook alerts, and a Safe Route API for couriers.

## Deployment (Google Cloud, `asia-southeast1`)

```
Firebase Hosting (Next.js static) ──► Cloud Run: floodwheel-backend (FastAPI)
                                          ├─► Cloud SQL (PostgreSQL 16 + PostGIS)
                                          ├─► Gemini API
                                          └─► Cloud Run: floodwheel-camera-backend
```

- **Cloud Run:** two services built with Cloud Build and stored in Artifact Registry. `floodwheel-camera-backend` runs at 512Mi and scales 0–5. `floodwheel-backend` runs at 1Gi, scales 0–10, and connects to Cloud SQL through a Unix socket. Both scale to zero when idle.
- **Cloud SQL:** `floodwheel-db`, PostgreSQL 16, `db-f1-micro`, 10GB SSD.
- **Firebase Hosting:** the frontend is built with `NEXT_PUBLIC_API_URL` set to the backend URL, then deployed with `firebase deploy --only hosting`. Live at https://zeroflood.web.app.
- **Firestore:** not used by the deploy script. Data lives in Cloud SQL.
- **Gemini:** the key is passed to the backend as `GEMINI_API_KEY`, and the model is set in backend code (the script does not name it). The deck says 2.5 Flash, so the intended model (3.8 Flash?) needs confirming.

Run with `./scripts/deploy_gcp_firebase.sh <GCP_PROJECT_ID> [REGION]`. It enables the APIs, deploys the camera backend, then Cloud SQL, then the core backend, and finally the frontend.

## Script issues to fix

1. Line 121 `Install frontend dependencies` is missing `#`, so the script stops there.
2. `DB_PASSWORD` is only set when the instance is first created, so re-running fails.
3. Secrets are passed as plain env vars; use Secret Manager (`--set-secrets`) instead.
4. The DB password is printed to the terminal and `ADMIN_PASSWORD` defaults to `admin123`.
5. Redis (mentioned in the deck) is not deployed.