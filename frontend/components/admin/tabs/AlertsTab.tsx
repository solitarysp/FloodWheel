import React from "react";
import { AlertTriangle } from "lucide-react";
import { AdminAlert } from "../types";

interface AlertsTabProps {
  alerts: AdminAlert[];
  onResolveAlert: (id: number) => void;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ alerts, onResolveAlert }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900">Active High Risk Alerts</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Severe flood alerts from Level 3 and above trigger webhooks and live map broadcasts
        </p>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((al) => (
            <div
              key={al.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                al.is_active
                  ? "bg-rose-50/70 border-rose-200 text-rose-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${al.is_active ? "text-rose-600" : "text-slate-400"}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Zone: {al.zone_id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      Level {al.level}
                    </span>
                    {!al.is_active && (
                      <span className="text-[10px] text-slate-500 font-semibold">Resolved</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">{al.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {al.created_at ? new Date(al.created_at).toLocaleString() : ""}
                  </span>
                </div>
              </div>

              {al.is_active && (
                <button
                  onClick={() => onResolveAlert(al.id)}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 text-xs font-bold shrink-0 transition"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-slate-400">
          No active high risk flood alerts at this time.
        </div>
      )}
    </div>
  );
};
