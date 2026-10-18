import React from "react";
import { Sliders, RefreshCw, Info } from "lucide-react";
import { useAdminConfig } from "../hooks/useAdminConfig";
import { ConfigAiPanel } from "./config/ConfigAiPanel";
import { ConfigQueuePanel } from "./config/ConfigQueuePanel";
import { ConfigSystemPanel } from "./config/ConfigSystemPanel";

interface ConfigTabProps {
  apiUrl: string;
  showToast: (type: "success" | "error", message: string) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ apiUrl, showToast }) => {
  const { config, loading, fetchConfig } = useAdminConfig(apiUrl, showToast);

  if (loading && !config) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">System & AI Configuration</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                View Only
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live inspection of Gemini AI inference, queue scheduler, and container environment variables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConfig()}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh Settings</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          These configuration values are loaded from the environment variables (e.g. <code className="font-mono font-bold">.env</code> and <code className="font-mono font-bold">docker-compose.yml</code>). To modify them, update the environment settings and restart the backend container.
        </span>
      </div>

      {/* Grid of Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ConfigAiPanel config={config} />
        <ConfigQueuePanel config={config} />
        <ConfigSystemPanel config={config} />
      </div>
    </div>
  );
};
