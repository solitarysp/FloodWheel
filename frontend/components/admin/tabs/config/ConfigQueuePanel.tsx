import React from "react";
import { Clock, Timer, HardDrive, ShieldCheck } from "lucide-react";
import { AdminConfigData } from "../../types";

interface ConfigQueuePanelProps {
  config: AdminConfigData | null;
}

export const ConfigQueuePanel: React.FC<ConfigQueuePanelProps> = ({ config }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Background AI Queue</h3>
              <span className="text-[11px] text-slate-400">Dispatcher & cycle scheduler</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
            {config?.queue?.status || "IDLE"}
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-950 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-blue-600" />
                Cycle Interval:
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                FLOOD_QUEUE_INTERVAL_MINUTES
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-blue-950 tracking-tight">
                {config?.queue?.interval_minutes || 30}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded-lg border border-blue-200/50">
                minutes / cycle
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Max Cameras / Cycle:</span>
            <span className="font-bold text-slate-800">
              {config?.queue?.max_cameras_per_cycle || 15} cameras
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              AI Cache TTL:
            </span>
            <span className="font-bold text-slate-800">
              {config?.queue?.cache_minutes || 5} minutes
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              Auto Start on Boot:
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                config?.queue?.auto_start
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {config?.queue?.auto_start ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Active Worker Processing:</span>
            <span
              className={`font-semibold ${
                config?.queue?.is_processing ? "text-amber-600 font-bold" : "text-slate-600"
              }`}
            >
              {config?.queue?.is_processing ? "Analyzing in background" : "Idle / Waiting"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
