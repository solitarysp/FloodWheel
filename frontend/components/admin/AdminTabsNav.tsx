import React from "react";
import { Radio, Camera, ShieldAlert, AlertTriangle } from "lucide-react";

interface AdminTabsNavProps {
  activeTab: "queue" | "cameras" | "overrides" | "alerts" | "config";
  setActiveTab: (tab: "queue" | "cameras" | "overrides" | "alerts" | "config") => void;
  camerasCount: number;
  zonesCount: number;
  activeAlertsCount: number;
}

export const AdminTabsNav: React.FC<AdminTabsNavProps> = ({
  activeTab,
  setActiveTab,
  camerasCount,
  zonesCount,
  activeAlertsCount,
}) => {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2 overflow-x-auto">
      <button
        onClick={() => setActiveTab("queue")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "queue"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Radio className="w-4 h-4" />
        <span>AI Queue Monitor</span>
      </button>

      <button
        onClick={() => setActiveTab("cameras")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "cameras"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Camera className="w-4 h-4" />
        <span>Camera Management ({camerasCount})</span>
      </button>

      <button
        onClick={() => setActiveTab("overrides")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "overrides"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <ShieldAlert className="w-4 h-4" />
        <span>Zone Overrides ({zonesCount})</span>
      </button>

      <button
        onClick={() => setActiveTab("alerts")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "alerts"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Active Alerts ({activeAlertsCount})</span>
      </button>

      <button
        onClick={() => setActiveTab("config")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "config"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Radio className="w-4 h-4 hidden" />
        <span className="flex items-center gap-1.5">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          System Configuration
        </span>
      </button>
    </div>
  );
};
