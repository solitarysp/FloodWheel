import React from "react";
import { AdminZone } from "../types";

interface OverridesTabProps {
  zones: AdminZone[];
  onSetOverride: (zone: AdminZone) => void;
  onCancelOverride: (zoneId: string, zoneName: string) => void;
}

export const OverridesTab: React.FC<OverridesTabProps> = ({
  zones,
  onSetOverride,
  onCancelOverride,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900">Zone Flood Depth Overrides</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Emergency manual override when on-site inspection is confirmed, temporarily overriding AI inference
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="pb-3">Zone Name</th>
              <th className="pb-3">District</th>
              <th className="pb-3">Current Depth</th>
              <th className="pb-3">Mode</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {zones.map((z) => (
              <tr key={z.id} className="hover:bg-slate-50/50">
                <td className="py-3 font-bold text-slate-900">{z.name}</td>
                <td className="py-3 text-slate-600">{z.district}</td>
                <td className="py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      z.current_depth_level >= 3
                        ? "bg-rose-100 text-rose-700"
                        : z.current_depth_level >= 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    Level {z.current_depth_level} ({z.current_depth_cm_min}-{z.current_depth_cm_max}cm)
                  </span>
                </td>
                <td className="py-3">
                  {z.is_overridden ? (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Manual Override ⚠
                    </span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      AI Automatic
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSetOverride(z)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
                    >
                      Set Override
                    </button>

                    {z.is_overridden && (
                      <button
                        onClick={() => onCancelOverride(z.id, z.name)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold transition"
                      >
                        Reset Override
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
