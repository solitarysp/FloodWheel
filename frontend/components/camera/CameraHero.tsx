import React from "react";
import { Camera as CameraIcon } from "lucide-react";
import { Camera } from "../CameraCard";

interface CameraHeroProps {
  cameras: Camera[];
}

export const CameraHero: React.FC<CameraHeroProps> = ({ cameras }) => {
  const analyzedCount = cameras.filter((c) => !!c.latest_reading).length;
  const floodedCount = cameras.filter(
    (c) => !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected)
  ).length;
  const maxFloodCm = Math.max(
    ...cameras.map((c) => c.latest_reading?.depth_estimate_cm_max || 0),
    0
  );

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white overflow-hidden shadow-xl border border-slate-800">
      <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
          <CameraIcon className="w-3.5 h-3.5" />
          <span>Municipal CCTV Snapshot Grid</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Live Public Cameras & AI Flood Surveillance
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Monitor real-time municipal traffic CCTV feeds across high-risk corridors. View live{" "}
          <strong className="text-white">snapshot feeds</strong> from HCMC traffic intersections, with automated
          flood depth measurement in centimeters powered by Gemini Vision VLRDR without physical sensor hardware.
        </p>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Total Cameras</span>
            <span className="text-xl font-bold text-white">{cameras.length} Nodes</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">AI Analyzed</span>
            <span className="text-xl font-bold text-blue-300">{analyzedCount} Feeds</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Flooded Hotspots</span>
            <span className="text-xl font-bold text-rose-400">{floodedCount} Locations</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Max Water Depth</span>
            <span className="text-xl font-bold text-amber-300">{maxFloodCm} cm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
