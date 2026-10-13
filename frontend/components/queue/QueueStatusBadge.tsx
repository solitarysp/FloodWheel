import React from "react";
import { Sparkles, Clock, Pause } from "lucide-react";
import { QueueStatus } from "../../types/queue";

interface QueueStatusBadgeProps {
  status: QueueStatus;
}

export const QueueStatusBadge: React.FC<QueueStatusBadgeProps> = ({ status }) => {
  const isRunning = status.status === "running";
  const isPaused = status.status === "paused";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {isRunning ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <Sparkles className="w-3.5 h-3.5" />
          AI Đang Phân Tích Ảnh Camera (Chu kỳ #{status.current_cycle_id})
        </span>
      ) : isPaused ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
          <Pause className="w-3.5 h-3.5" />
          Hàng Đợi Đang Tạm Dừng
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
          <Clock className="w-3.5 h-3.5" />
          Hàng Đợi Chờ Lần Quét Kế Tiếp
        </span>
      )}

      <span className="text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
        Chu kỳ: 30 phút sau khi lần chạy cuối hoàn tất
      </span>
    </div>
  );
};
