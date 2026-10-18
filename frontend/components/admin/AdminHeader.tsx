import React from "react";
import { Sliders, Trash2, RefreshCw, Zap } from "lucide-react";

interface AdminHeaderProps {
  adminUser: { username?: string } | null;
  loading: boolean;
  actionLoading: string | null;
  onClearAllReadings: () => void;
  onFakeRandomFlood?: () => void;
  onRefreshData: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminUser,
  loading,
  actionLoading,
  onClearAllReadings,
  onFakeRandomFlood,
  onRefreshData,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Admin Management Portal
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manage AI Background Queue, Traffic Surveillance Cameras, and Emergency Flood Overrides
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
          Operator: <strong className="text-indigo-600 font-bold">{adminUser?.username || "admin"}</strong>
        </span>

        {onFakeRandomFlood && (
          <button
            onClick={onFakeRandomFlood}
            disabled={actionLoading === "fake-random-flood"}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            title="[TEST] Generate random flood and dry alerts on cameras"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-600 ${actionLoading === "fake-random-flood" ? "animate-bounce" : ""}`} />
            <span>{actionLoading === "fake-random-flood" ? "Generating..." : "⚡ Test Fake Flood"}</span>
          </button>
        )}

        <button
          onClick={onClearAllReadings}
          disabled={actionLoading === "clear-readings"}
          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          title="Delete all AI analysis readings and reset all zones to Level 0"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>{actionLoading === "clear-readings" ? "Clearing..." : "Clear All Readings"}</span>
        </button>

        <button
          onClick={onRefreshData}
          disabled={loading}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-sm"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>
    </div>
  );
};
