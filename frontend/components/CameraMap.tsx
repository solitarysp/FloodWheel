import React, { useEffect, useRef, useState } from "react";
import { Camera } from "./CameraCard";
import {
  Camera as CameraIcon,
  Maximize2,
  RefreshCw,
  Sparkles,
  MapPin,
  ExternalLink,
  Layers,
  ZoomIn,
} from "lucide-react";

interface CameraMapProps {
  cameras: Camera[];
  onAnalyze?: (camera: Camera, capturedFrameBase64?: string) => void;
  selectedCameraId?: string | null;
  className?: string;
}

export const CameraMap: React.FC<CameraMapProps> = ({
  cameras,
  onAnalyze,
  selectedCameraId,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number>(Date.now());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Filter cameras that have valid coordinates
  const validCameras = cameras.filter(
    (c) =>
      typeof c.latitude === "number" &&
      typeof c.longitude === "number" &&
      c.latitude >= 10.0 &&
      c.latitude <= 11.5 &&
      c.longitude >= 106.0 &&
      c.longitude <= 107.5
  );

  // 1. Load Leaflet and MarkerCluster via CDN if not present in runtime
  useEffect(() => {
    let isMounted = true;

    const loadLeafletAssets = async () => {
      if (typeof window === "undefined") return;

      // Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Inject MarkerCluster CSS
      if (!document.getElementById("markercluster-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(link);
      }

      // Helper to load external scripts sequentially
      const loadScript = (src: string, id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (document.getElementById(id)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.id = id;
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = reject;
          document.body.appendChild(script);
        });
      };

      try {
        if (!(window as any).L) {
          await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet-js");
        }
        if (!(window as any).L?.markerClusterGroup) {
          await loadScript(
            "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
            "markercluster-js"
          );
        }

        if (isMounted) {
          setIsMapReady(true);
        }
      } catch (err) {
        console.error("Failed to load Leaflet libraries:", err);
      }
    };

    loadLeafletAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      // HCMC Center coordinates
      const defaultCenter = [10.7769, 106.7009];
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
      });

      // Add Zoom control to top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // CartoDB Voyager Tile Layer with CARTO API Key (removes watermark & guarantees quota)
      const cartoKey =
        process.env.NEXT_PUBLIC_CARTO_API_KEY ||
        "cb1_4g68_1_c5828bbd64347d68c42bf808";

      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Initialize Cluster Group
      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let sizeClass = "cluster-badge-sm w-9 h-9";
          if (count >= 15 && count < 60) {
            sizeClass = "cluster-badge-md w-11 h-11";
          } else if (count >= 60) {
            sizeClass = "cluster-badge-lg w-13 h-13";
          }

          return L.divIcon({
            html: `<div class="custom-cluster-badge ${sizeClass}"><span>${count}</span></div>`,
            className: "",
            iconSize: L.point(40, 40),
          });
        },
      });

      map.addLayer(clusterGroup);

      mapInstanceRef.current = map;
      clusterGroupRef.current = clusterGroup;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, [isMapReady]);

  // 3. Render and Update Camera Pins
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();
    markersMapRef.current.clear();

    const newMarkers: any[] = [];

    validCameras.forEach((cam) => {
      const isOnline = cam.status.toUpperCase() === "ONLINE";

      // Custom Single Pin Icon
      const pinHtml = `
        <div class="cam-marker-pin ${isOnline ? "" : "offline"}">
          <svg class="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        html: pinHtml,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon });

      // Click handler updates active selected camera drawer/card
      marker.on("click", () => {
        setSelectedCamera(cam);
        setSnapshotTimestamp(Date.now());
      });

      newMarkers.push(marker);
      markersMapRef.current.set(cam.id, marker);
    });

    clusterGroup.addLayers(newMarkers);
  }, [validCameras, isMapReady]);

  // 4. Center selected camera if specified
  useEffect(() => {
    if (!selectedCameraId || !mapInstanceRef.current) return;
    const marker = markersMapRef.current.get(selectedCameraId);
    if (marker) {
      const targetCam = validCameras.find((c) => c.id === selectedCameraId);
      if (targetCam) {
        setSelectedCamera(targetCam);
        setSnapshotTimestamp(Date.now());
        mapInstanceRef.current.setView([targetCam.latitude, targetCam.longitude], 16, {
          animate: true,
        });
      }
    }
  }, [selectedCameraId]);

  const handleRecenterHCMC = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([10.7769, 106.7009], 12, { animate: true });
    }
  };

  return (
    <div className={`relative w-full h-[620px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Header: Telemetry & Controls */}
      <div className="absolute top-4 left-4 z-[500] flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/70 text-xs text-white shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide">
            HCMC CCTV Surveillance Map • {validCameras.length} Active Feeds
          </span>
        </div>

        <button
          onClick={handleRecenterHCMC}
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/70 text-xs text-slate-200 font-medium shadow-xl transition flex items-center gap-1.5"
          title="Recenter Map to HCMC Center"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>Recenter HCMC</span>
        </button>
      </div>

      {/* Loading Skeleton before Leaflet initializes */}
      {!isMapReady && (
        <div className="absolute inset-0 z-[600] bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">Initializing Leaflet CCTV Grid...</span>
        </div>
      )}

      {/* Floating Inspection Card (Selected Camera Preview) */}
      {selectedCamera && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] z-[500] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Card Header */}
          <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-800/80">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </span>
                <span className="text-[11px] font-medium text-slate-400 truncate">
                  {selectedCamera.location || "TP. Hồ Chí Minh"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate leading-snug">
                {selectedCamera.name}
              </h3>
            </div>

            <button
              onClick={() => setSelectedCamera(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Close preview"
            >
              ✕
            </button>
          </div>

          {/* Snapshot Image Container */}
          <div className="relative aspect-video bg-black overflow-hidden group">
            <img
              src={`${apiUrl}/api/v1/cameras/${selectedCamera.id}/snapshot?w=480&h=270&t=${snapshotTimestamp}`}
              alt={selectedCamera.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={() => setSnapshotLoading(false)}
              onError={(e) => {
                setSnapshotLoading(false);
                // Fallback to synthetic preview if image fails
                (e.target as HTMLImageElement).src = `${apiUrl}/api/v1/cameras/${selectedCamera.id}/snapshot?t=${Date.now()}`;
              }}
            />

            {/* Refresh snapshot button */}
            <button
              onClick={() => {
                setSnapshotLoading(true);
                setSnapshotTimestamp(Date.now());
              }}
              className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-xl border border-white/10 backdrop-blur-md transition hover:scale-105"
              title="Refresh snapshot frame"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${snapshotLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            {/* CCTV Timestamp Overlay */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-slate-300 backdrop-blur-sm border border-white/5">
              LIVE SNAPSHOT FEED
            </div>
          </div>

          {/* Card Action Footer */}
          <div className="p-3.5 bg-slate-900/60 flex items-center justify-between gap-2.5">
            <div className="text-[11px] text-slate-400 font-mono">
              GPS: {selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}
            </div>

            {onAnalyze && (
              <button
                onClick={() => onAnalyze(selectedCamera)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze with AI</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
