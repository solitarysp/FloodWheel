import React from "react";
import { RefreshCw, Clock } from "lucide-react";
import { Camera } from "../CameraCard";

interface CameraPreviewDrawerProps {
  selectedCamera: Camera | null;
  onClose: () => void;
  snapshotTimestamp: number;
  snapshotLoading: boolean;
  onRefreshSnapshot: () => void;
  onAnalyze?: (camera: Camera) => void;
  apiUrl: string;
}

export const CameraPreviewDrawer: React.FC<CameraPreviewDrawerProps> = ({
  selectedCamera,
  onClose,
  snapshotTimestamp,
  snapshotLoading,
  onRefreshSnapshot,
  onAnalyze,
  apiUrl,
}) => {
  if (!selectedCamera) return null;

  return (
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
              selectedCamera.latest_reading.alert_message === "Đang chờ ảnh từ cam" ||
              selectedCamera.latest_reading.alert_message === "Waiting for camera frame" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span>WAITING FOR FRAME</span>
                </span>
              ) : (
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
                      ? "DRY (0cm)"
                      : `FLOOD L${selectedCamera.latest_reading.depth_level}: ${selectedCamera.latest_reading.depth_estimate_cm_max}cm`}
                  </span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-medium">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span>Awaiting Analysis</span>
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
          onClick={onClose}
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
        />

        <button
          onClick={onRefreshSnapshot}
          className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-xl border border-white/10 backdrop-blur-md transition hover:scale-105"
          title="Refresh snapshot frame"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${snapshotLoading ? "animate-spin text-blue-400" : ""}`} />
        </button>

        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-slate-300 backdrop-blur-sm border border-white/5">
          LIVE SNAPSHOT FEED
        </div>
      </div>

      {/* AI Flood Analysis Result Details */}
      {selectedCamera.latest_reading ? (
        <div className="p-3.5 bg-slate-900/80 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Estimated Depth:</span>
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
              <strong className="text-slate-300">AI Analysis (VLRDR): </strong>
              {selectedCamera.latest_reading.reasoning}
            </div>
          )}

          {selectedCamera.latest_reading.reference_objects &&
            selectedCamera.latest_reading.reference_objects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-400">Reference Objects:</span>
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
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 text-xs text-amber-300/90 text-center flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-medium">Awaiting Analysis</span>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2.5">
        <div className="text-[11px] text-slate-400 font-mono truncate">
          {selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}
        </div>

        {!selectedCamera.latest_reading ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Awaiting Analysis</span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono">
            {selectedCamera.latest_reading.timestamp
              ? new Date(selectedCamera.latest_reading.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Analyzed"}
          </span>
        )}
      </div>
    </div>
  );
};
