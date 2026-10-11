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
  ShieldAlert,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

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

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number>(Date.now());
  const [floodFilter, setFloodFilter] = useState<"all" | "flooded" | "dry" | "unanalyzed">("all");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Filter cameras that have valid coordinates in HCMC bounds
  const validCameras = cameras.filter(
    (c) =>
      typeof c.latitude === "number" &&
      typeof c.longitude === "number" &&
      c.latitude >= 10.0 &&
      c.latitude <= 11.5 &&
      c.longitude >= 106.0 &&
      c.longitude <= 107.5
  );

  // Metrics computation
  const analyzedCount = validCameras.filter((c) => !!c.latest_reading).length;
  const floodedCount = validCameras.filter(
    (c) => !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected)
  ).length;
  const dryCount = validCameras.filter(
    (c) => !!c.latest_reading && (c.latest_reading.depth_level || 0) === 0 && !c.latest_reading.flood_detected
  ).length;
  const unanalyzedCount = validCameras.length - analyzedCount;
  const maxDepthCm = Math.max(
    ...validCameras.map((c) => c.latest_reading?.depth_estimate_cm_max || 0),
    0
  );

  // Filter cameras by flood status for map display
  const displayedCameras = validCameras.filter((c) => {
    if (floodFilter === "all") return true;
    if (floodFilter === "flooded") {
      return !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected);
    }
    if (floodFilter === "dry") {
      return !!c.latest_reading && (c.latest_reading.depth_level || 0) === 0 && !c.latest_reading.flood_detected;
    }
    if (floodFilter === "unanalyzed") {
      return !c.latest_reading;
    }
    return true;
  });

  // 1. Load Leaflet and MarkerCluster via CDN if not present in runtime
  // 1. Asynchronously Load Leaflet and MarkerCluster Assets
  useEffect(() => {
    let isMounted = true;

    const loadLeafletAssets = async () => {
      if (typeof window === "undefined") return;

      // Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // MarkerCluster Core CSS
      if (!document.getElementById("markercluster-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css";
        document.head.appendChild(link);
      }

      // MarkerCluster Default Theme CSS
      if (!document.getElementById("markercluster-default-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-default-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css";
        document.head.appendChild(link);
      }

      const loadScript = (src: string, id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const existing = document.getElementById(id) as HTMLScriptElement | null;
          if (existing) {
            if (existing.dataset.loaded === "true") {
              resolve();
              return;
            }
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", reject);
            // In case it already finished loading earlier
            setTimeout(() => resolve(), 300);
            return;
          }

          const script = document.createElement("script");
          script.id = id;
          script.src = src;
          script.async = false; // MUST run sequentially to ensure L is defined first
          script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      try {
        // Step 1: Load Leaflet core script first
        if (!(window as any).L) {
          await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet-js");
        }

        // Verify window.L exists before injecting markercluster plugin
        if ((window as any).L && typeof (window as any).L.markerClusterGroup !== "function") {
          await loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js",
            "markercluster-js"
          );
        }

        // Wait briefly for plugin registration on window.L
        let retries = 0;
        while (retries < 25 && !(window as any).L?.markerClusterGroup) {
          await new Promise((r) => setTimeout(r, 60));
          retries++;
        }

        if (isMounted) {
          setIsMapReady(true);
        }
      } catch (err) {
        console.error("Failed to load Leaflet or MarkerCluster scripts:", err);
        // Still allow map to initialize with standard layerGroup fallback
        if (isMounted && (window as any).L) {
          setIsMapReady(true);
        }
      }
    };

    loadLeafletAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.7769, 106.7009],
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      // CartoDB Voyager Tile Layer with CARTO API Key
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

      // Initialize Cluster Group or fallback to standard Layer Group if plugin failed
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

            let sizeClass = "cluster-badge-sm w-9 h-9";
            if (count >= 15 && count < 60) {
              sizeClass = "cluster-badge-md w-11 h-11";
            } else if (count >= 60) {
              sizeClass = "cluster-badge-lg w-13 h-13";
            }

            const floodBadgeClass = hasFlood ? "cluster-has-flood" : "";

            return L.divIcon({
              html: `<div class="custom-cluster-badge ${sizeClass} ${floodBadgeClass}"><span>${count}</span></div>`,
              className: "",
              iconSize: L.point(40, 40),
            });
          },
        });
      } else {
        console.warn("L.markerClusterGroup not detected; falling back to L.layerGroup()");
        clusterGroup = L.layerGroup();
      }

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

  // 3. Render and Update Camera Pins based on flood status
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();
    markersMapRef.current.clear();

    const newMarkers: any[] = [];

    displayedCameras.forEach((cam) => {
      const isOnline = cam.status.toUpperCase() === "ONLINE";
      const reading = cam.latest_reading;
      const isFlooded = !!reading && ((reading.depth_level || 0) >= 1 || reading.flood_detected);

      let pinModifier = "flood-unanalyzed";
      let badgeLabel = "Chưa quét";
      let iconColor = "text-blue-400";

      if (reading) {
        const lvl = reading.depth_level ?? 0;
        if (lvl === 0) {
          pinModifier = "flood-level-0";
          badgeLabel = "0cm";
          iconColor = "text-emerald-400";
        } else if (lvl <= 2) {
          pinModifier = "flood-level-2";
          badgeLabel = `${reading.depth_estimate_cm_max || 20}cm`;
          iconColor = "text-amber-400";
        } else if (lvl === 3) {
          pinModifier = "flood-level-3";
          badgeLabel = `${reading.depth_estimate_cm_max || 40}cm`;
          iconColor = "text-orange-400";
        } else {
          pinModifier = "flood-level-4";
          badgeLabel = `🚨 ${reading.depth_estimate_cm_max || 60}cm`;
          iconColor = "text-rose-400";
        }
      } else if (!isOnline) {
        pinModifier += " offline";
      }

      // Custom Single Pin Icon with depth pill
      const pinHtml = `
        <div class="relative flex flex-col items-center">
          <div class="cam-marker-pin ${pinModifier}">
            <svg class="w-3.5 h-3.5 ${iconColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
          <span class="absolute -bottom-2 bg-slate-900/95 text-white border border-slate-700/80 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono tracking-tighter whitespace-nowrap shadow-md">
            ${badgeLabel}
          </span>
        </div>
      `;

      const icon = L.divIcon({
        html: pinHtml,
        className: "",
        iconSize: [40, 44],
        iconAnchor: [20, 22],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([cam.latitude, cam.longitude], {
        icon,
        isFlooded,
      } as any);

      // Click handler updates active selected camera drawer/card
      marker.on("click", () => {
        setSelectedCamera(cam);
        setSnapshotTimestamp(Date.now());
      });

      newMarkers.push(marker);
      markersMapRef.current.set(cam.id, marker);
    });

    if (typeof clusterGroup.addLayers === "function") {
      clusterGroup.addLayers(newMarkers);
    } else {
      newMarkers.forEach((m) => clusterGroup.addLayer(m));
    }
  }, [displayedCameras, isMapReady]);

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
    <div className={`relative w-full h-[660px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col ${className}`}>
      {/* Top Overlay Banner: Metrics & Flood Filters */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Side: Telemetry Pill & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Main Title Badge */}
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/70 text-xs text-white shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">
              Bản đồ Lũ & Camera HCMC • {displayedCameras.length}/{validCameras.length} Node
            </span>
          </div>

          {/* Quick Metrics Strip */}
          <div className="hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/70 text-[11px] text-slate-300 shadow-xl">
            <span>Đã quét: <strong className="text-white">{analyzedCount}</strong></span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-semibold">Điểm ngập: <strong>{floodedCount}</strong></span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-semibold">Sâu nhất: <strong>{maxDepthCm}cm</strong></span>
          </div>

          {/* Flood Status Filter Segmented Control */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/70 text-[11px] shadow-xl">
            <button
              onClick={() => setFloodFilter("all")}
              className={`px-2.5 py-1 rounded-xl font-medium transition ${
                floodFilter === "all" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Tất cả ({validCameras.length})
            </button>
            <button
              onClick={() => setFloodFilter("flooded")}
              className={`px-2.5 py-1 rounded-xl font-medium transition ${
                floodFilter === "flooded" ? "bg-rose-600 text-white font-bold" : "text-rose-400 hover:text-rose-200"
              }`}
            >
              🔴 Ngập ({floodedCount})
            </button>
            <button
              onClick={() => setFloodFilter("dry")}
              className={`px-2.5 py-1 rounded-xl font-medium transition ${
                floodFilter === "dry" ? "bg-emerald-600 text-white font-bold" : "text-emerald-400 hover:text-emerald-200"
              }`}
            >
              🟢 Khô ({dryCount})
            </button>
            <button
              onClick={() => setFloodFilter("unanalyzed")}
              className={`px-2.5 py-1 rounded-xl font-medium transition ${
                floodFilter === "unanalyzed" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              ⚪ Chưa quét ({unanalyzedCount})
            </button>
          </div>
        </div>

        {/* Right Side: Batch Analysis Action & Recenter */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onBatchAnalyze && (
            <button
              onClick={onBatchAnalyze}
              disabled={isBatchAnalyzing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-xl transition flex items-center gap-1.5 active:scale-95"
              title="Quét và phân tích toàn bộ ảnh camera bằng Gemini Vision AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBatchAnalyzing ? "animate-spin text-amber-300" : ""}`} />
              <span>{isBatchAnalyzing ? "Đang quét AI..." : "⚡ Quét AI các camera"}</span>
            </button>
          )}

          <button
            onClick={handleRecenterHCMC}
            className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/70 text-xs text-slate-200 font-medium shadow-xl transition flex items-center gap-1.5"
            title="Recenter Map to HCMC Center"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">HCMC Center</span>
          </button>
        </div>
      </div>

      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Skeleton before Leaflet initializes */}
      {!isMapReady && (
        <div className="absolute inset-0 z-[600] bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">Initializing Leaflet CCTV Grid...</span>
        </div>
      )}

      {/* Floating Inspection Card (Selected Camera Preview & Flood Intelligence) */}
      {selectedCamera && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[420px] max-h-[90%] overflow-y-auto z-[500] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Card Header */}
          <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-800/80">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {selectedCamera.status}
                </span>

                {selectedCamera.latest_reading ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (selectedCamera.latest_reading.depth_level || 0) === 0
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                        : (selectedCamera.latest_reading.depth_level || 0) <= 2
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-400/40 animate-pulse"
                    }`}
                  >
                    <span>
                      {(selectedCamera.latest_reading.depth_level || 0) === 0
                        ? "KHÔ RÁO (0cm)"
                        : `NGẬP CẤP ${selectedCamera.latest_reading.depth_level}: ${selectedCamera.latest_reading.depth_estimate_cm_max}cm`}
                    </span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                    Chưa quét AI
                  </span>
                )}

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

          {/* AI Flood Analysis Result Details */}
          {selectedCamera.latest_reading ? (
            <div className="p-3.5 bg-slate-900/80 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Độ sâu ước tính:</span>
                <span className="font-bold text-amber-300 font-mono text-sm">
                  {selectedCamera.latest_reading.depth_estimate_cm_min} - {selectedCamera.latest_reading.depth_estimate_cm_max} cm
                </span>
              </div>

              {selectedCamera.latest_reading.alert_message && (
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-200 leading-relaxed">
                  {selectedCamera.latest_reading.alert_message}
                </div>
              )}

              {selectedCamera.latest_reading.reasoning && (
                <div className="text-[11px] text-slate-400 leading-snug">
                  <strong className="text-slate-300">Phân tích AI (VLRDR): </strong>
                  {selectedCamera.latest_reading.reasoning}
                </div>
              )}

              {selectedCamera.latest_reading.reference_objects &&
                selectedCamera.latest_reading.reference_objects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-400">Vật thể tham chiếu:</span>
                    {selectedCamera.latest_reading.reference_objects.map((obj, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-slate-800 text-blue-300 rounded text-[10px] border border-slate-700"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-400 text-center">
              Chưa có dữ liệu phân tích ngập lụt. Nhấn "Phân tích với AI" để kích hoạt Gemini Vision VLRDR.
            </div>
          )}

          {/* Card Action Footer */}
          <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2.5">
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}
            </div>

            {onAnalyze && (
              <button
                onClick={() => onAnalyze(selectedCamera)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{selectedCamera.latest_reading ? "Phân tích lại" : "Phân tích với AI"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
