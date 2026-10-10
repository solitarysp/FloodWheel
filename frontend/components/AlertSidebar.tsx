import React from "react";
import { AlertTriangle, ShieldAlert, ArrowRight, BellRing, MapPin } from "lucide-react";

interface AlertItem {
  zone_id: string;
  name: string;
  district: string;
  depth_level: number;
  depth_cm_min: number;
  depth_cm_max: number;
  last_updated: string | null;
}

interface AlertSidebarProps {
  alerts: AlertItem[];
  onSelectZone: (zoneId: string) => void;
}

export const AlertSidebar: React.FC<AlertSidebarProps> = ({ alerts, onSelectZone }) => {
  return (
    <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2 text-rose-400">
          <BellRing className="w-5 h-5 animate-bounce" />
          <h3 className="font-extrabold text-sm text-white">Critical Red Alerts (Level ≥ 3)</h3>
        </div>
        <span className="text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
          {alerts.length} critical zones
        </span>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {alerts.length > 0 ? (
          alerts.map((item) => (
            <div
              key={item.zone_id}
              onClick={() => onSelectZone(item.zone_id)}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-400/80 cursor-pointer transition space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-rose-300 transition">
                  {item.name}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                  L{item.depth_level}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  {item.depth_cm_min}–{item.depth_cm_max} cm
                </span>
                <span className="text-[11px] text-slate-400">{item.district}</span>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl flex items-center justify-between">
                <span>Motorcycle exhaust submerged — Stalling hazard!</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 text-center py-6 bg-slate-900/40 rounded-2xl">
            No critical flood emergencies in the metropolitan area.
          </div>
        )}
      </div>
    </div>
  );
};
