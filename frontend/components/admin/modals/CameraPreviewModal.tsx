import React, { useState } from "react";
import { Camera, RefreshCw, ExternalLink, X, Sparkles, Clock } from "lucide-react";

interface CameraPreviewModalProps {
  camera: any | null;
  onClose: () => void;
  cacheBuster: number;
  onRefreshCache: () => void;
  analyzingCameraId: string | null;
  onAnalyzeCamera: (id: string) => void;
  apiUrl: string;
}

export const CameraPreviewModal: React.FC<CameraPreviewModalProps> = ({
  camera,
  onClose,
  cacheBuster,
  onRefreshCache,
  analyzingCameraId,
  onAnalyzeCamera,
  apiUrl,
}) => {
  if (!camera) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {camera.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {camera.id} • {camera.location || "TP. Hồ Chí Minh"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAnalyzeCamera(camera.id)}
              disabled={analyzingCameraId === camera.id}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
              title="Run AI analysis now for this camera snapshot"
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${analyzingCameraId === camera.id ? "animate-spin" : ""}`}
              />
              <span>
                {analyzingCameraId === camera.id ? "Scanning AI..." : "🔥 AI Analyze Now"}
              </span>
            </button>

            <button
              onClick={onRefreshCache}
              title="Refresh snapshot"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <a
              href={`${apiUrl}/api/v1/cameras/${camera.id}/snapshot?t=${cacheBuster}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open raw image in new tab"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Raw Image</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Snapshot Image Area */}
        <div className="relative bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[62vh] overflow-hidden p-3">
          <img
            src={`${apiUrl}/api/v1/cameras/${camera.id}/snapshot?t=${cacheBuster}`}
            alt={camera.name}
            className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360' fill='%231e293b'><rect width='640' height='360' fill='%230f172a'/><text x='50%' y='50%' fill='%2394a3b8' font-size='18' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>No snapshot image found for this camera</text></svg>";
            }}
          />
          <div className="absolute bottom-5 left-5 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Latest stored snapshot</span>
            <span className="text-white/40">•</span>
            <span className="text-white/70 font-mono text-[11px]">/api/v1/cameras/{camera.id}/snapshot</span>
          </div>
        </div>

        {/* Footer / Telemetry */}
        <div className="px-6 py-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full font-bold ${
                camera.status === "ONLINE"
                  ? "bg-emerald-100 text-emerald-700"
                  : camera.status === "MAINTENANCE"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {camera.status}
            </span>
            {camera.latest_reading?.alert_message === "Đang chờ ảnh từ cam" ||
            camera.latest_reading?.alert_message === "Waiting for camera frame" ? (
              <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Waiting for camera frame
              </span>
            ) : camera.latest_reading ? (
              <span
                className={`px-2.5 py-1 rounded-full font-bold ${
                  camera.latest_reading.depth_level >= 3
                    ? "bg-rose-100 text-rose-700"
                    : camera.latest_reading.depth_level >= 1
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                Flood Level: Level {camera.latest_reading.depth_level} (
                {camera.latest_reading.water_depth_cm ?? 0} cm)
              </span>
            ) : (
              <span className="text-slate-400">No flood analysis results yet</span>
            )}
          </div>

          <div className="text-slate-400 text-[11px]">
            Coordinates: {camera.latitude}, {camera.longitude}
          </div>
        </div>
      </div>
    </div>
  );
};
