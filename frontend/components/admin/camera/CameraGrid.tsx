import React from "react";
import { Eye, Sparkles, RotateCcw, Trash2, Clock, Maximize2 } from "lucide-react";

interface CameraGridProps {
  filteredCameras: any[];
  selectedCameraIds: string[];
  toggleSelectCamera: (id: string) => void;
  setPreviewCameraSnapshot: (cam: any) => void;
  apiUrl: string;
  cacheBuster: number;
  handleAnalyzeCamera: (id: string) => void;
  analyzingCameraId: string | null;
  handleUpdateCameraStatus: (id: string, status: string) => void;
  handleDeleteCameraReading: (id: string, name?: string) => void;
  handleDeleteCamera: (id: string, name: string) => void;
  actionLoading: string | null;
}

export const CameraGrid: React.FC<CameraGridProps> = ({
  filteredCameras,
  selectedCameraIds,
  toggleSelectCamera,
  setPreviewCameraSnapshot,
  apiUrl,
  cacheBuster,
  handleAnalyzeCamera,
  analyzingCameraId,
  handleUpdateCameraStatus,
  handleDeleteCameraReading,
  handleDeleteCamera,
  actionLoading,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredCameras.map((cam) => (
        <div
          key={cam.id}
          className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
            selectedCameraIds.includes(cam.id)
              ? "border-orange-400 ring-2 ring-orange-300 shadow-md"
              : "border-slate-200/80 shadow-xs hover:shadow-md"
          }`}
        >
          {/* Snapshot viewport */}
          <div
            onClick={() => setPreviewCameraSnapshot(cam)}
            className="relative aspect-video bg-slate-950 overflow-hidden group cursor-pointer"
            title="Click to preview snapshot frame"
          >
            <img
              src={`${apiUrl}/api/v1/cameras/${cam.id}/snapshot?t=${cacheBuster}`}
              alt={cam.name}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180' fill='%231e293b'><rect width='320' height='180' fill='%230f172a'/><text x='50%' y='50%' fill='%2364748b' font-size='13' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>Camera Signal Lost</text></svg>";
              }}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Selection Checkbox */}
            <div
              className="absolute top-2.5 right-2.5 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedCameraIds.includes(cam.id)}
                onChange={() => toggleSelectCamera(cam.id)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-white/80 cursor-pointer shadow-md bg-white/95"
                title="Select camera for batch scan"
              />
            </div>

            {/* Status Badge overlay */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs backdrop-blur-xs ${
                  cam.status === "ONLINE"
                    ? "bg-emerald-500/90 text-white"
                    : cam.status === "MAINTENANCE"
                    ? "bg-amber-500/90 text-white"
                    : "bg-slate-700/90 text-slate-200"
                }`}
              >
                {cam.status}
              </span>
              {cam.latest_reading?.alert_message === "Đang chờ ảnh từ cam" ||
              cam.latest_reading?.alert_message === "Waiting for camera frame" ? (
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs backdrop-blur-xs bg-slate-900/90 text-slate-200 border border-white/20 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-300" />
                  <span>Waiting for frame</span>
                </span>
              ) : cam.latest_reading ? (
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs ${
                    cam.latest_reading.depth_level >= 3
                      ? "bg-rose-500/90 text-white"
                      : cam.latest_reading.depth_level >= 1
                      ? "bg-amber-500/90 text-white"
                      : "bg-emerald-600/90 text-white"
                  }`}
                >
                  Level {cam.latest_reading.depth_level}
                </span>
              ) : null}
            </div>

            {/* Hover zoom icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
              <Maximize2 className="w-5 h-5 drop-shadow" />
              <span className="text-xs font-bold drop-shadow">Zoom In</span>
            </div>

            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white/90">
              Latest Snapshot
            </div>
          </div>

          {/* Card Info */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1" title={cam.name}>
                    {cam.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{cam.id}</p>
                </div>
                <button
                  onClick={() => setPreviewCameraSnapshot(cam)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shrink-0"
                  title="View snapshot details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2 line-clamp-1">
                📍 {cam.location || "TP. Hồ Chí Minh"}
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleAnalyzeCamera(cam.id)}
                  disabled={analyzingCameraId === cam.id}
                  title="Analyze this camera with AI now"
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    analyzingCameraId === cam.id
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs shadow-orange-500/20"
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${analyzingCameraId === cam.id ? "animate-spin" : ""}`} />
                  <span>{analyzingCameraId === cam.id ? "Scanning..." : "AI Scan"}</span>
                </button>

                {cam.status !== "ONLINE" && (
                  <button
                    onClick={() => handleUpdateCameraStatus(cam.id, "ONLINE")}
                    className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                  >
                    Online
                  </button>
                )}
                {cam.status !== "OFFLINE" && (
                  <button
                    onClick={() => handleUpdateCameraStatus(cam.id, "OFFLINE")}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold"
                  >
                    Offline
                  </button>
                )}
                {cam.status !== "MAINTENANCE" && (
                  <button
                    onClick={() => handleUpdateCameraStatus(cam.id, "MAINTENANCE")}
                    className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold"
                  >
                    Maintenance
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {cam.latest_reading && (
                  <button
                    onClick={() => handleDeleteCameraReading(cam.id, cam.name)}
                    disabled={actionLoading === `del-reading-${cam.id}`}
                    title="Clear AI reading for this camera"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCamera(cam.id, cam.name)}
                  title="Delete camera"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
