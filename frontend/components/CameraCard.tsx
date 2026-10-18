import React, { useState } from "react";
import {
  Camera as CameraIcon,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Clock,
} from "lucide-react";

export interface FloodReadingSummary {
  flood_detected: boolean;
  depth_level: number | null;
  depth_estimate_cm_min: number;
  depth_estimate_cm_max: number;
  confidence_score: number;
  alert_message: string;
  reasoning?: string;
  reference_objects?: string[];
  timestamp: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  camera_angle: string;
  stream_url: string;
  video_url?: string;
  zone_id?: string;
  status: string;
  latest_reading?: FloodReadingSummary | null;
}

interface CameraCardProps {
  camera: Camera;
  cacheBuster: number;
  onAnalyze?: (camera: Camera, capturedFrameBase64?: string) => Promise<void>;
  isAnalyzing?: boolean;
  onRefreshOne?: (cameraId: string) => void;
}

export const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  cacheBuster,
  onAnalyze,
  isAnalyzing,
  onRefreshOne,
}) => {
  const [localBuster, setLocalBuster] = useState(cacheBuster);
  const [imgError, setImgError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const effectiveBuster = localBuster || cacheBuster;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const snapshotSrc = `${apiUrl}/api/v1/cameras/${camera.id}/snapshot?t=${effectiveBuster}`;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setImgError(false);
    const nextBuster = Date.now();
    setLocalBuster(nextBuster);
    if (onRefreshOne) onRefreshOne(camera.id);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getAngleLabel = (angle: string) => {
    switch (angle) {
      case "street_level":
        return "Street Level (~2m)";
      case "overhead":
        return "Overhead (>8m)";
      case "elevated":
      default:
        return "Elevated Pole (~5m)";
    }
  };

  const isOnline = camera.status.toUpperCase() === "ONLINE";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {camera.status}
            </span>

            {/* Flood Status Badge */}
            {camera.latest_reading ? (
              camera.latest_reading.alert_message === "Đang chờ ảnh từ cam" ||
              camera.latest_reading.alert_message === "Waiting for camera frame" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Waiting for frame</span>
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    (camera.latest_reading.depth_level || 0) === 0
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : (camera.latest_reading.depth_level || 0) <= 2
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                  }`}
                >
                  <span>
                    {(camera.latest_reading.depth_level || 0) === 0
                      ? "Dry (0cm)"
                      : `Flooded L${camera.latest_reading.depth_level}: ${camera.latest_reading.depth_estimate_cm_max}cm`}
                  </span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Awaiting Analysis</span>
              </span>
            )}

            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-auto">
              {camera.id}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm truncate" title={camera.name}>
            {camera.name}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{camera.location}</span>
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          title="Refresh camera snapshot"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Snapshot Feed Viewport */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden group">
        {!imgError ? (
          <img
            src={snapshotSrc}
            alt={camera.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-400">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs font-medium">Snapshot Feed Offline</p>
            <button
              onClick={handleManualRefresh}
              className="mt-2 text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry Connection
            </button>
          </div>
        )}

        {/* Live OSD Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>SNAPSHOT FEED</span>
        </div>

        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-slate-200 px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 pointer-events-none">
          {getAngleLabel(camera.camera_angle)}
        </div>

        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 pointer-events-none">
          {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
        </div>
      </div>

      {/* Card Actions & AI Analysis */}
      <div className="p-4 bg-slate-50/50 mt-auto border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-mono">
          <span className="text-slate-400">Zone: </span>
          <span className="font-semibold text-slate-700">{camera.zone_id || "Unassigned"}</span>
        </div>

        {camera.latest_reading ? (
          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <span className="text-slate-400">Water Depth:</span>
            <span className="font-bold text-slate-800 font-mono">
              {(camera.latest_reading.depth_level || 0) === 0
                ? "0 cm"
                : `${camera.latest_reading.depth_estimate_cm_max} cm`}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Awaiting Analysis</span>
          </div>
        )}
      </div>
    </div>
  );
};
