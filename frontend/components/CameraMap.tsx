import React, { useEffect, useRef, useState } from "react";
import { Camera } from "./CameraCard";
import { useLeafletAssets } from "./map/useLeafletAssets";
import { MapToolbar } from "./map/MapToolbar";
import { CameraPreviewDrawer } from "./map/CameraPreviewDrawer";
import { createCameraMarker } from "./map/cameraMarkerHelper";

interface CameraMapProps {
  cameras: Camera[];
  onAnalyze?: (camera: Camera, capturedFrameBase64?: string) => void;
  selectedCameraId?: string | null;
  className?: string;
  onBatchAnalyze?: () => Promise<void>;
  isBatchAnalyzing?: boolean;
}

export const CameraMap: React.FC<CameraMapProps> = ({
  cameras,
  onAnalyze,
  selectedCameraId,
  className = "",
  onBatchAnalyze,
  isBatchAnalyzing = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());

  const { isMapReady } = useLeafletAssets();
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number>(Date.now());
  const [floodFilter, setFloodFilter] = useState<"all" | "flooded" | "dry" | "unanalyzed">("all");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const validCameras = cameras.filter(
    (c) =>
      typeof c.latitude === "number" &&
      typeof c.longitude === "number" &&
      c.latitude >= 10.0 &&
      c.latitude <= 11.5 &&
      c.longitude >= 106.0 &&
      c.longitude <= 107.5
  );

  const analyzedCount = validCameras.filter((c) => !!c.latest_reading).length;
  const floodedCount = validCameras.filter(
    (c) => !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected)
  ).length;
  const dryCount = validCameras.filter(
    (c) => !!c.latest_reading && (c.latest_reading.depth_level || 0) === 0 && !c.latest_reading.flood_detected
  ).length;
  const unanalyzedCount = validCameras.length - analyzedCount;
  const maxDepthCm = Math.max(...validCameras.map((c) => c.latest_reading?.depth_estimate_cm_max || 0), 0);

  const displayedCameras = validCameras.filter((c) => {
    if (floodFilter === "all") return true;
    if (floodFilter === "flooded") {
      return !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected);
    }
    if (floodFilter === "dry") {
      return !!c.latest_reading && (c.latest_reading.depth_level || 0) === 0 && !c.latest_reading.flood_detected;
    }
    if (floodFilter === "unanalyzed") return !c.latest_reading;
    return true;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      center: [10.7769, 106.7009],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);

    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_4g68_1_c5828bbd64347d68c42bf808";
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    let clusterGroup: any;
    if (typeof L.markerClusterGroup === "function") {
      clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const markers = cluster.getAllChildMarkers();
          const hasFlood = markers.some((m: any) => m.options?.isFlooded);
          let sizeClass = count >= 60 ? "cluster-badge-lg w-13 h-13" : count >= 15 ? "cluster-badge-md w-11 h-11" : "cluster-badge-sm w-9 h-9";
          const floodBadgeClass = hasFlood ? "cluster-has-flood" : "";
          return L.divIcon({
            html: `<div class="custom-cluster-badge ${sizeClass} ${floodBadgeClass}"><span>${count}</span></div>`,
            className: "",
            iconSize: L.point(40, 40),
          });
        },
      });
    } else {
      clusterGroup = L.layerGroup();
    }

    map.addLayer(clusterGroup);
    mapInstanceRef.current = map;
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, [isMapReady]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();
    markersMapRef.current.clear();

    const newMarkers = displayedCameras.map((cam) => {
      const marker = createCameraMarker(L, cam, (c) => {
        setSelectedCamera(c);
        setSnapshotTimestamp(Date.now());
      });
      markersMapRef.current.set(cam.id, marker);
      return marker;
    });

    if (typeof clusterGroup.addLayers === "function") {
      clusterGroup.addLayers(newMarkers);
    } else {
      newMarkers.forEach((m) => clusterGroup.addLayer(m));
    }
  }, [displayedCameras, isMapReady]);

  // Focus selected camera
  useEffect(() => {
    if (!selectedCameraId || !mapInstanceRef.current) return;
    const targetCam = validCameras.find((c) => c.id === selectedCameraId);
    if (targetCam) {
      setSelectedCamera(targetCam);
      setSnapshotTimestamp(Date.now());
      mapInstanceRef.current.setView([targetCam.latitude, targetCam.longitude], 16, { animate: true });
    }
  }, [selectedCameraId]);

  return (
    <div className={`relative w-full h-[660px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col ${className}`}>
      <MapToolbar
        displayedCount={displayedCameras.length}
        totalValidCount={validCameras.length}
        analyzedCount={analyzedCount}
        floodedCount={floodedCount}
        maxDepthCm={maxDepthCm}
        dryCount={dryCount}
        unanalyzedCount={unanalyzedCount}
        floodFilter={floodFilter}
        setFloodFilter={setFloodFilter}
        onBatchAnalyze={onBatchAnalyze}
        isBatchAnalyzing={isBatchAnalyzing}
        onRecenter={() => mapInstanceRef.current?.setView([10.7769, 106.7009], 12, { animate: true })}
      />

      <div ref={mapContainerRef} className="w-full h-full" />

      {!isMapReady && (
        <div className="absolute inset-0 z-[600] bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">Initializing Leaflet CCTV Grid...</span>
        </div>
      )}

      <CameraPreviewDrawer
        selectedCamera={selectedCamera}
        onClose={() => setSelectedCamera(null)}
        snapshotTimestamp={snapshotTimestamp}
        snapshotLoading={snapshotLoading}
        onRefreshSnapshot={() => {
          setSnapshotLoading(true);
          setSnapshotTimestamp(Date.now());
        }}
        onAnalyze={onAnalyze}
        apiUrl={apiUrl}
      />
    </div>
  );
};
