import React from "react";
import { Play, Pause, RefreshCw } from "lucide-react";
import { QueueStatus } from "../../types/queue";

interface QueueControlButtonsProps {
  status: QueueStatus;
  isTriggering: boolean;
  isPausing: boolean;
  onTriggerNow: () => void;
  onTogglePause: () => void;
}

export const QueueControlButtons: React.FC<QueueControlButtonsProps> = ({
  status,
  isTriggering,
  isPausing,
  onTriggerNow,
  onTogglePause,
}) => {
  const isRunning = status.status === "running";
  const isPaused = status.status === "paused";

  return (
    <div className="flex items-center gap-2 self-end md:self-center">
      <button
        onClick={onTriggerNow}
        disabled={isTriggering || isRunning}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition active:scale-95"
        title="Chạy phân tích AI ngay lập tức không cần chờ 30 phút"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isTriggering || isRunning ? "animate-spin text-amber-300" : ""}`} />
        <span>{isRunning ? "Đang chạy..." : "⚡ Phân tích ngay"}</span>
      </button>

      <button
        onClick={onTogglePause}
        disabled={isPausing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
        title={isPaused ? "Tiếp tục chạy tự động" : "Tạm dừng tự động"}
      >
        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
        <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
      </button>
    </div>
  );
};
