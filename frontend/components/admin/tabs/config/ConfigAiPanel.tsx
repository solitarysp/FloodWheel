import React from "react";
import { Cpu, CheckCircle2, Key, Zap } from "lucide-react";
import { AdminConfigData } from "../../types";

interface ConfigAiPanelProps {
  config: AdminConfigData | null;
}

export const ConfigAiPanel: React.FC<ConfigAiPanelProps> = ({ config }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gemini Vision AI</h3>
              <span className="text-[11px] text-slate-400">Multi-key client pool</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                Simultaneous Analyses:
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                AI_ANALYSIS_CONCURRENCY
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-indigo-950 tracking-tight">
                {config?.ai?.concurrency || 1}
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-200/50">
                parallel workers
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Primary Model:</span>
            <span className="font-mono font-bold text-slate-800">{config?.ai?.primary_model}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Fallback Model:</span>
            <span className="font-mono font-semibold text-slate-700">{config?.ai?.fallback_model}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Pacing Delay:</span>
            <span className="font-bold text-slate-800">{config?.ai?.min_call_interval_seconds}s</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Key className="w-3 h-3 text-slate-400" />
              API Key Status:
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[11px]">
              Configured ({config?.ai?.api_keys_count || 1} active)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
