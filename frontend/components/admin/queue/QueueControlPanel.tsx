import React from "react";
import { Play, Pause, RefreshCw, Settings as SettingsIcon, Clock, AlertTriangle } from "lucide-react";
import { AdminOverview } from "../types";

interface QueueControlPanelProps {
  overview: AdminOverview | null;
  countdownSeconds: number;
  actionLoading: string | null;
  onTriggerQueue: () => void;
  onResumeQueue: () => void;
  onPauseQueue: () => void;
  onOpenConfig: () => void;
}

export const QueueControlPanel: React.FC<QueueControlPanelProps> = ({
  overview,
  countdownSeconds,
  actionLoading,
  onTriggerQueue,
  onResumeQueue,
  onPauseQueue,
  onOpenConfig,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Điều Khiển & Giám Sát Hàng Đợi AI (AI Queue Monitor)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tự động quét camera mỗi 30 phút, luân phiên phân tích ngập bằng Gemini Vision và chống nghẽn quota
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onTriggerQueue}
            disabled={actionLoading === "trigger" || overview?.queue?.status === "running"}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
          >
            {actionLoading === "trigger" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Quét Ngay Lập Tức</span>
          </button>

          {overview?.queue?.status === "paused" ? (
            <button
              onClick={onResumeQueue}
              disabled={actionLoading === "resume"}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Tiếp Tục Chạy</span>
            </button>
          ) : (
            <button
              onClick={onPauseQueue}
              disabled={actionLoading === "pause" || overview?.queue?.status === "running"}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Tạm Dừng</span>
            </button>
          )}

          <button
            onClick={onOpenConfig}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
            title="Cấu hình chu kỳ và số lượng camera"
          >
            <SettingsIcon className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
