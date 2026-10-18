import React from "react";
import {
  X,
  Sparkles,
  Clock,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Bike,
  Car,
  Truck,
  Bus,
} from "lucide-react";
import { Camera } from "./CameraCard";

export interface FloodReading {
  camera_id: string;
  flood_detected: boolean;
  confidence_score: number;
  depth_level: number | null;
  depth_estimate_cm_min: number;
  depth_estimate_cm_max: number;
  reference_objects_used: string[];
  reasoning: string;
  alert_message: string;
}

export interface AnalysisResponse {
  success: boolean;
  reading: FloodReading;
  inference_time_ms: number;
  model_used: string;
  tokens_used?: number;
}

interface CameraAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResponse | null;
  camera: Camera | null;
  snapshotSrc: string;
}

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  0: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Level 0: Dry Surface" },
  1: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Level 1: Minor Pooling (5-15cm)" },
  2: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Level 2: Moderate Pooling (15-30cm)" },
  3: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Level 3: Danger (30-45cm)" },
  4: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Level 4: Deep Flood (45-70cm)" },
  5: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Level 5: Catastrophic (>70cm)" },
};

export const CameraAnalysisModal: React.FC<CameraAnalysisModalProps> = ({
  isOpen,
  onClose,
  result,
  camera,
  snapshotSrc,
}) => {
  if (!isOpen || !result || !camera) return null;

  const { reading, inference_time_ms, model_used } = result;
  const depthLevel = reading.depth_level ?? 0;
  const levelStyle = LEVEL_COLORS[depthLevel] || LEVEL_COLORS[0];

  const getPassability = (vehicle: "bike" | "sedan" | "suv" | "truck") => {
    switch (vehicle) {
      case "bike":
        if (depthLevel === 0) return { status: "Passable", color: "text-emerald-600 bg-emerald-50" };
        if (depthLevel === 1) return { status: "Passable", color: "text-emerald-600 bg-emerald-50" };
        if (depthLevel === 2) return { status: "Caution", color: "text-amber-600 bg-amber-50" };
        return { status: "Stall Risk", color: "text-red-600 bg-red-50" };
      case "sedan":
        if (depthLevel <= 2) return { status: "Passable", color: "text-emerald-600 bg-emerald-50" };
        if (depthLevel === 3) return { status: "Hydrolock Risk", color: "text-amber-600 bg-amber-50" };
        return { status: "Impassable", color: "text-red-600 bg-red-50" };
      case "suv":
        if (depthLevel <= 3) return { status: "Passable", color: "text-emerald-600 bg-emerald-50" };
        if (depthLevel === 4) return { status: "Caution", color: "text-amber-600 bg-amber-50" };
        return { status: "Impassable", color: "text-red-600 bg-red-50" };
      case "truck":
        if (depthLevel <= 4) return { status: "Passable", color: "text-emerald-600 bg-emerald-50" };
        return { status: "Critical", color: "text-red-600 bg-red-50" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Gemini Vision VLRDR Snapshot Analysis</span>
                <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {model_used}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {camera.name} • {camera.location}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Captured Frame Image */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-950">
                <img
                  src={snapshotSrc}
                  alt="Analyzed Frame"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-emerald-400 px-2 py-0.5 rounded text-[11px] font-mono border border-emerald-500/20">
                  ANALYZED FRAME
                </div>
                <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                  Camera: {camera.id}
                </div>
              </div>

              {/* Latency & Telemetry Chips */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Inference: <strong>{inference_time_ms} ms</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  Confidence: <strong>{Math.round(reading.confidence_score * 100)}%</strong>
                </span>
              </div>
            </div>

            {/* Right: Depth Metrics & Passability */}
            <div className="space-y-4">
              {/* Severity Banner */}
              <div className={`p-4 rounded-2xl border ${levelStyle.border} ${levelStyle.bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${levelStyle.text}`}>
                    {levelStyle.label}
                  </span>
                  <span className={`text-2xl font-black ${levelStyle.text}`}>
                    {reading.depth_estimate_cm_min}–{reading.depth_estimate_cm_max} cm
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 font-medium">
                  {reading.alert_message}
                </p>
              </div>

              {/* Visual Landmarks */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Identified Visual Landmarks (VLRDR Rulers)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {reading.reference_objects_used && reading.reference_objects_used.length > 0 ? (
                    reading.reference_objects_used.map((landmark, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium"
                      >
                        {landmark}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No submerged landmarks identified.</span>
                  )}
                </div>
              </div>

              {/* Vehicle Passability Matrix */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">
                  Vehicle Passability Matrix
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: "bike", label: "2-Wheelers", icon: Bike },
                    { key: "sedan", label: "Sedans", icon: Car },
                    { key: "suv", label: "SUVs", icon: Truck },
                    { key: "truck", label: "Buses/Trucks", icon: Bus },
                  ].map(({ key, label, icon: Icon }) => {
                    const pass = getPassability(key as "bike" | "sedan" | "suv" | "truck");
                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-xl border border-slate-100 flex items-center justify-between ${pass.color}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-slate-900">{label}</span>
                        </div>
                        <span className="font-bold">{pass.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* AI Reasoning Narrative */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Gemini Vision Reasoning Narrative
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-mono">
              {reading.reasoning}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition"
          >
            Close Results
          </button>
        </div>
      </div>
    </div>
  );
};
