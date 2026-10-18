import React from "react";
import { X, Sliders, RefreshCw, AlertCircle, Video, CheckCircle2, ShieldAlert, History } from "lucide-react";

interface ZoneDetailPanelProps {
  zoneData: any;
  onClose: () => void;
  onOpenOverride: () => void;
  onRevertOverride: () => void;
}

export const ZoneDetailPanel: React.FC<ZoneDetailPanelProps> = ({
  zoneData,
  onClose,
  onOpenOverride,
  onRevertOverride,
}) => {
  if (!zoneData) return null;
  const { zone, history } = zoneData;

  const level = zone.current_depth_level || 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-6 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {zone.district} • {zone.city.toUpperCase()}
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{zone.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Status Badge */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">VLRDR Alert Status:</span>
          {zone.is_overridden && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
              ⚡ Manual Override
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900">
            Level {level}
          </span>
          <span className="text-base font-bold text-slate-600">
            ({zone.current_depth_cm_min} – {zone.current_depth_cm_max} cm)
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {level === 0 && "Roadway completely dry, vehicles flowing smoothly."}
          {level === 1 && "Minor puddles 5–15cm, safe for motorcycles and cars."}
          {level === 2 && "Moderate water 15–30cm around curbs. Two-wheelers drive with caution."}
          {level === 3 && "Dangerous flood 30–38cm submerging exhaust tips. Two-wheelers at high risk of stalling!"}
          {level === 4 && "Severe inundation 45–70cm submerging seats and car sills. Thoroughfare paralyzed!"}
          {level === 5 && "Emergency: Inundation exceeding 70cm. Vehicles floating, route completely closed!"}
        </p>
      </div>

      {/* Operator Actions */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Operator Controls:
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenOverride}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual Override</span>
          </button>

          {zone.is_overridden && (
            <button
              onClick={onRevertOverride}
              className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              title="Restore Automated AI Mode"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recent History Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Recent CCTV Scan History
          </span>
          <span>{history?.length || 0} readings</span>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {history && history.length > 0 ? (
            history.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    Level {item.depth_level} ({item.depth_cm_min}-{item.depth_cm_max}cm)
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {item.alert_message}
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "--:--"}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
              No camera scan history recorded in the last 24 hours.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
