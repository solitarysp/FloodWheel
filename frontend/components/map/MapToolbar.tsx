import React from "react";
import { Sparkles, MapPin } from "lucide-react";
import { Camera } from "../CameraCard";

interface MapToolbarProps {
  displayedCount: number;
  totalValidCount: number;
  analyzedCount: number;
  floodedCount: number;
  maxDepthCm: number;
  dryCount: number;
  unanalyzedCount: number;
  floodFilter: "all" | "flooded" | "dry" | "unanalyzed";
  setFloodFilter: (filter: "all" | "flooded" | "dry" | "unanalyzed") => void;
  onBatchAnalyze?: () => Promise<void>;
  isBatchAnalyzing: boolean;
  onRecenter: () => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  displayedCount,
  totalValidCount,
  analyzedCount,
  floodedCount,
  maxDepthCm,
  dryCount,
  unanalyzedCount,
  floodFilter,
  setFloodFilter,
  onBatchAnalyze,
  isBatchAnalyzing,
  onRecenter,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/70 text-xs text-white shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide">
            HCMC Flood & Camera Map • {displayedCount}/{totalValidCount} Nodes
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/70 text-[11px] text-slate-300 shadow-xl">
          <span>Scanned: <strong className="text-white">{analyzedCount}</strong></span>
          <span className="text-slate-600">•</span>
          <span className="text-rose-400 font-semibold">Flooded: <strong>{floodedCount}</strong></span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-semibold">Max Depth: <strong>{maxDepthCm}cm</strong></span>
        </div>

        <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/70 text-[11px] shadow-xl">
          <button
            onClick={() => setFloodFilter("all")}
            className={`px-2.5 py-1 rounded-xl font-medium transition ${
              floodFilter === "all" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            All ({totalValidCount})
          </button>
          <button
            onClick={() => setFloodFilter("flooded")}
            className={`px-2.5 py-1 rounded-xl font-medium transition ${
              floodFilter === "flooded" ? "bg-rose-600 text-white font-bold" : "text-rose-400 hover:text-rose-200"
            }`}
          >
            🔴 Flooded ({floodedCount})
          </button>
          <button
            onClick={() => setFloodFilter("dry")}
            className={`px-2.5 py-1 rounded-xl font-medium transition ${
              floodFilter === "dry" ? "bg-emerald-600 text-white font-bold" : "text-emerald-400 hover:text-emerald-200"
            }`}
          >
            🟢 Dry ({dryCount})
          </button>
          <button
            onClick={() => setFloodFilter("unanalyzed")}
            className={`px-2.5 py-1 rounded-xl font-medium transition ${
              floodFilter === "unanalyzed" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            ⚪ Not Analyzed ({unanalyzedCount})
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {onBatchAnalyze && (
          <button
            onClick={onBatchAnalyze}
            disabled={isBatchAnalyzing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-2xl font-bold text-xs shadow-xl transition flex items-center gap-1.5 active:scale-95"
            title="Scan and analyze all camera frames with Gemini Vision AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isBatchAnalyzing ? "animate-spin text-amber-300" : ""}`} />
            <span>{isBatchAnalyzing ? "Scanning AI..." : "⚡ AI Batch Scan"}</span>
          </button>
        )}

        <button
          onClick={onRecenter}
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/70 text-xs text-slate-200 font-medium shadow-xl transition flex items-center gap-1.5"
          title="Recenter Map to HCMC Center"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">HCMC Center</span>
        </button>
      </div>
    </div>
  );
};
