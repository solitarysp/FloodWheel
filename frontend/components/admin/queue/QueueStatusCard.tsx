import React from "react";
import { Sparkles, Clock, Pause, AlertTriangle, Play, RefreshCw } from "lucide-react";
import { AdminOverview } from "../types";

interface QueueStatusCardProps {
  overview: AdminOverview | null;
  countdownSeconds: number;
  actionLoading: string | null;
  onResumeQueue: () => void;
  onTriggerQueue: () => void;
}

export const QueueStatusCard: React.FC<QueueStatusCardProps> = ({
  overview,
  countdownSeconds,
  actionLoading,
  onResumeQueue,
  onTriggerQueue,
}) => {
  const status = overview?.queue?.status;

  if (status === "running") {
    const cycleProgress = (overview?.queue as any)?.cycle_progress;
    const processed = cycleProgress?.processed || 0;
    const total = cycleProgress?.total || 1;
    const percent = Math.min(100, Math.round((processed / total) * 100));

    return (
      <div className="rounded-3xl p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/40 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-400 animate-ping" />
            <h4 className="text-base font-black tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              AI Analyzing Cycle #{ (overview?.queue as any)?.current_cycle_id || 1}
            </h4>
          </div>
          <div className="text-xs font-mono text-blue-300">
            {processed} / {total} Cameras ({percent}%)
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-4 border border-slate-700/60">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-300 block">Processing</span>
            <span className="font-bold text-blue-200 truncate block mt-0.5">
              {(overview?.queue as any)?.current_camera_name || (overview?.queue as any)?.current_camera_id || "Loading image..."}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-300 block">Success</span>
            <span className="text-xl font-black text-emerald-400">
              {cycleProgress?.success || 0}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-300 block">Flooded Points</span>
            <span className="text-xl font-black text-rose-400">
              {cycleProgress?.flooded || 0}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-300 block">Skipped / Failed</span>
            <span className="text-xl font-black text-amber-300">
              {(cycleProgress?.skipped || 0) + (cycleProgress?.failed || 0)}
            </span>
            <span className="text-[10px] text-slate-300/80 block">
              {cycleProgress?.skipped || 0} skipped • {cycleProgress?.failed || 0} failed
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="rounded-3xl p-6 bg-amber-500/10 border border-amber-300/60 text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Pause className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-amber-950">AI Queue Paused</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Automatic scanning every {overview?.queue?.interval_minutes || 30} minutes is paused. Click Resume to re-enable.
            </p>
          </div>
        </div>
        <button
          onClick={onResumeQueue}
          disabled={actionLoading === "resume"}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Resume Queue</span>
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-3xl p-6 bg-rose-50 border border-rose-200 text-rose-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-rose-950">Queue Encountered an Error</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              The system recovered to a safe state. You can restart the scan cycle at any time.
            </p>
          </div>
        </div>
        <button
          onClick={onTriggerQueue}
          disabled={actionLoading === "trigger"}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restart Now</span>
        </button>
      </div>
    );
  }

  // Idle state with countdown clock
  const lastSummary = (overview?.queue as any)?.last_cycle_summary;

  return (
    <div className="rounded-3xl p-6 bg-white border border-slate-200/80 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
              Next AI Scan Cycle (Countdown)
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
              {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
              {String(countdownSeconds % 60).padStart(2, "0")}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Scheduled at:{" "}
              <strong className="text-slate-800">
                {(overview?.queue as any)?.next_run_at
                  ? new Date((overview?.queue as any).next_run_at).toLocaleTimeString()
                  : "Ready to scan"}
              </strong>
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Duration</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {lastSummary?.duration_seconds !== undefined ? `${lastSummary.duration_seconds}s` : "N/A"}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Cycle #{lastSummary?.cycle_id || (overview?.queue as any)?.current_cycle_id || 0}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cameras Scanned</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {lastSummary?.total_cameras || 0}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {lastSummary?.successful || 0} success
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-rose-500 block">Flooded Points</span>
            <div className="text-lg font-black text-rose-600 mt-0.5">
              {lastSummary?.flooded_count || 0}
            </div>
            <span className="text-[10px] text-rose-400 block">flood zones</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-blue-500 block">Max Flood Depth</span>
            <div className="text-lg font-black text-blue-600 mt-0.5">
              {lastSummary?.max_depth_cm || 0} cm
            </div>
            <span className="text-[10px] text-blue-400 block">AI estimate</span>
          </div>
        </div>
      </div>
    </div>
  );
};
