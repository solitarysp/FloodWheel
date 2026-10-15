import React from "react";
import { Server, Database, Layers } from "lucide-react";
import { AdminConfigData } from "../../types";

interface ConfigSystemPanelProps {
  config: AdminConfigData | null;
}

export const ConfigSystemPanel: React.FC<ConfigSystemPanelProps> = ({ config }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Environment & Services</h3>
              <span className="text-[11px] text-slate-400">Container configurations</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {config?.system?.environment || "DEV"}
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Log Level:</span>
            <span className="font-mono font-bold text-slate-800">{config?.system?.log_level}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Camera Backend:</span>
            <span className="font-mono text-slate-700 truncate max-w-[150px]">
              {config?.system?.camera_backend_url}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <Database className="w-3 h-3" /> Database:
            </span>
            <span
              className="font-mono text-[11px] text-slate-700 truncate max-w-[150px]"
              title={config?.system?.database_url}
            >
              {config?.system?.database_url}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Redis Cache:
            </span>
            <span
              className="font-mono text-[11px] text-slate-700 truncate max-w-[150px]"
              title={config?.system?.redis_url}
            >
              {config?.system?.redis_url}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Snapshot Dir:</span>
            <span className="font-mono text-[11px] text-slate-700">{config?.system?.snapshot_storage_dir}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Max Upload Size:</span>
            <span className="font-bold text-slate-800">{config?.system?.max_image_size_mb} MB</span>
          </div>

          <div>
            <span className="text-slate-500 block mb-1">CORS Origins:</span>
            <div className="flex flex-wrap gap-1">
              {config?.system?.cors_origins?.map((o, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
