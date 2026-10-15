import React from "react";
import { Camera, Radio, ShieldAlert, AlertTriangle } from "lucide-react";
import { AdminOverview } from "./types";

interface AdminKpiCardsProps {
  overview: AdminOverview | null;
  cameras?: any[];
  totalCameras: number;
  totalZones: number;
  totalAlerts: number;
  overriddenZonesCount: number;
}

export const AdminKpiCards: React.FC<AdminKpiCardsProps> = ({
  overview,
  cameras,
  totalCameras,
  totalZones,
  totalAlerts,
  overriddenZonesCount,
}) => {
  const onlineCount =
    cameras && cameras.length > 0
      ? cameras.filter((c) => c.status?.toUpperCase() === "ONLINE").length
      : overview?.cameras?.online || 0;

  const offlineCount =
    cameras && cameras.length > 0
      ? cameras.filter((c) => c.status?.toUpperCase() === "OFFLINE").length
      : overview?.cameras?.offline || 0;

  const totalCount =
    cameras && cameras.length > 0
      ? cameras.length
      : overview?.cameras?.total || totalCameras;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Cameras */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Cameras</span>
          <Camera className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-black text-slate-900">
          {totalCount}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="text-emerald-600 font-semibold">{onlineCount} Online</span>
          <span>&bull;</span>
          <span className="text-slate-400">{offlineCount} Offline</span>
        </div>
      </div>

      {/* Card 2: AI Queue */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">AI Queue</span>
          <Radio className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              overview?.queue?.status === "running"
                ? "bg-emerald-500 animate-ping"
                : overview?.queue?.status === "paused"
                ? "bg-amber-500"
                : "bg-indigo-500"
            }`}
          />
          <div className="text-xl font-black capitalize text-slate-900">
            {overview?.queue?.status || "Idle"}
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500 truncate">
          {overview?.queue?.next_run_in_seconds
            ? `Next cycle: in ${Math.round(overview.queue.next_run_in_seconds / 60)}m`
            : "Ready to scan"}
        </div>
      </div>

      {/* Card 3: Zone Overrides */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Manual Overrides</span>
          <ShieldAlert className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-black text-slate-900">
          {overview?.zones?.overridden || overriddenZonesCount}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          out of {overview?.zones?.total || totalZones} total zones
        </div>
      </div>

      {/* Card 4: Alerts */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Active Alerts</span>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-2xl font-black text-rose-600">
          {overview?.alerts?.active_count || totalAlerts}
        </div>
        <div className="mt-2 text-xs text-slate-500">currently triggered</div>
      </div>
    </div>
  );
};
