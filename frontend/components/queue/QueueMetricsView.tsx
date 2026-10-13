import React from "react";
import { QueueStatus } from "../../types/queue";

interface QueueMetricsViewProps {
  status: QueueStatus;
  secondsRemaining: number;
}

export const QueueMetricsView: React.FC<QueueMetricsViewProps> = ({ status, secondsRemaining }) => {
  const isRunning = status.status === "running";
  const progress = status.cycle_progress;
  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} phút ${s < 10 ? "0" : ""}${s} giây`;
  };

  if (isRunning) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
          <span className="truncate">
            Đang xử lý:{" "}
            <strong className="text-blue-300 font-semibold">
              {status.current_camera_name || status.current_camera_id || "Đang tải ảnh..."}
            </strong>
          </span>
          <span className="font-mono text-blue-300">
            {progress.processed} / {progress.total} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Đã quét: <strong className="text-emerald-400">{progress.success}</strong></span>
          <span>Điểm ngập: <strong className="text-rose-400">{progress.flooded}</strong></span>
          {(progress.skipped || 0) > 0 && (
            <span>Bỏ qua (ảnh default): <strong className="text-slate-300">{progress.skipped}</strong></span>
          )}
          {progress.failed > 0 && <span>Lỗi: <strong className="text-amber-400">{progress.failed}</strong></span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
      <div>
        Thời gian chạy tiếp theo:{" "}
        <strong className="text-amber-300 font-bold font-mono text-sm">
          {secondsRemaining > 0 ? formatCountdown(secondsRemaining) : "Chuẩn bị khởi chạy..."}
        </strong>
      </div>

      {status.last_cycle_summary?.total_cameras != null && (
        <div className="flex items-center gap-2 text-slate-400 text-[11px] border-l border-slate-700 pl-3">
          <span>Lần chạy trước:</span>
          <span className="text-slate-200 font-semibold">
            {status.last_cycle_summary.total_cameras} camera
          </span>
          <span>•</span>
          <span className="text-rose-400 font-semibold">
            {status.last_cycle_summary.flooded_count} điểm ngập
          </span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">
            Sâu nhất: {status.last_cycle_summary.max_depth_cm}cm
          </span>
          {(status.last_cycle_summary.skipped || 0) > 0 && (
            <>
              <span>•</span>
              <span className="text-slate-400">
                Bỏ qua default: {status.last_cycle_summary.skipped}
              </span>
            </>
          )}
          <span>•</span>
          <span className="text-slate-400">
            {status.last_cycle_summary.duration_seconds}s
          </span>
        </div>
      )}
    </div>
  );
};
