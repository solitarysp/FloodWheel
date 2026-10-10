# FloodWheel — Dependencies: Frontend Map Stack

## Required Packages in `frontend/package.json`

| Package | Version | Purpose |
|---|---|---|
| `leaflet` | `^1.9.4` | Core interactive map engine |
| `@types/leaflet` | `^1.9.12` | TypeScript definitions for Leaflet |
| `leaflet.markercluster` | `^1.5.3` | Marker cluster plugin for grouping dense pins |
| `@types/leaflet.markercluster` | `^1.5.4` | TypeScript definitions for markercluster |

## Asset Dependencies
- Leaflet CSS: `leaflet/dist/leaflet.css`
- MarkerCluster CSS: `leaflet.markercluster/dist/MarkerCluster.css` and `MarkerCluster.Default.css`
- Tile Server: CartoDB Positron / OSM public tile services
