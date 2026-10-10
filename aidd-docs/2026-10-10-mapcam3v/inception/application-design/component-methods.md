# FloodWheel — Component Methods Specification

## 1. `CameraMap`
```typescript
interface CameraMapProps {
  cameras: Camera[];
  onAnalyze?: (camera: Camera, frameBase64?: string) => void;
  selectedCameraId?: string | null;
  className?: string;
}

// Key internal methods:
function createCustomMarkerIcon(status: string): L.DivIcon;
function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon;
function createPopupContent(camera: Camera, apiUrl: string, onAnalyze?: Function): HTMLElement;
function updateMarkers(map: L.Map, clusterGroup: L.MarkerClusterGroup, cameras: Camera[]): void;
```

## 2. Marker HTML Icon Design
```html
<!-- Single Online Camera Marker -->
<div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-lg cursor-pointer transform hover:scale-110 transition">
  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75"></span>
  <svg class="w-4 h-4 text-emerald-400" ...><!-- CCTV Icon --></svg>
</div>

<!-- Marker Cluster Badge -->
<div class="flex items-center justify-center font-bold text-xs text-white rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-blue-300 shadow-xl">
  <span>{count}</span>
</div>
```
