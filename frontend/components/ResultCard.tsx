import React from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, Clock, Cpu, Gauge } from "lucide-react";

export interface FloodReadingData {
  camera_id: string;
  timestamp: string;
  flood_detected: boolean;
  confidence_score: number;
  depth_level: number | null;
  depth_estimate_cm_min: number;
  depth_estimate_cm_max: number;
  reference_objects_used: string[];
  reasoning: string;
  alert_message: string;
}

export interface AnalysisResponseData {
  success: boolean;
  reading: FloodReadingData;
  inference_time_ms: number;
  model_used: string;
  tokens_used?: number | null;
}

interface ResultCardProps {
  data: AnalysisResponseData;
  imagePreview?: string;
  fileName?: string;
}

const LEVEL_CONFIG: Record<
  number,
  { label: string; color: string; badge: string; border: string; bg: string }
> = {
  0: {
    label: "Level 0: Khô ráo (0cm)",
    color: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-300",
    bg: "bg-emerald-50/50",
  },
  1: {
    label: "Level 1: Vũng nước nhỏ (5-15cm)",
    color: "text-lime-700",
    badge: "bg-lime-100 text-lime-800",
    border: "border-lime-300",
    bg: "bg-lime-50/50",
  },
  2: {
    label: "Level 2: Chú ý (15-30cm)",
    color: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-300",
    bg: "bg-amber-50/50",
  },
  3: {
    label: "Level 3: Nguy hiểm — Chìm ống xả (30-45cm)",
    color: "text-orange-700",
    badge: "bg-orange-100 text-orange-800",
    border: "border-orange-300",
    bg: "bg-orange-50/50",
  },
  4: {
    label: "Level 4: Ngập sâu — Chìm yên xe (45-70cm)",
    color: "text-red-700",
    badge: "bg-red-100 text-red-800",
    border: "border-red-300",
    bg: "bg-red-50/50",
  },
  5: {
    label: "Level 5: Khẩn cấp — Xe ngập lút (>70cm)",
    color: "text-purple-700",
    badge: "bg-purple-100 text-purple-800",
    border: "border-purple-300",
    bg: "bg-purple-50/50",
  },
};

export const ResultCard: React.FC<ResultCardProps> = ({ data, imagePreview, fileName }) => {
  const { reading, inference_time_ms, model_used } = data;
  const level = reading.depth_level !== null ? reading.depth_level : 0;
  const levelInfo = LEVEL_CONFIG[level] || LEVEL_CONFIG[0];

  return (
    <div className={`rounded-2xl border ${levelInfo.border} ${levelInfo.bg} p-6 shadow-sm transition hover:shadow-md`}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image Preview */}
        {imagePreview && (
          <div className="w-full md:w-56 h-48 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative">
            <img src={imagePreview} alt="CCTV Frame" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded truncate">
              {fileName || reading.camera_id}
            </div>
          </div>
        )}

        {/* Analysis Details */}
        <div className="flex-1 space-y-4">
          {/* Header & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${levelInfo.badge}`}>
                {levelInfo.label}
              </span>
              {reading.flood_detected ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <ShieldAlert className="w-3.5 h-3.5" /> Có ngập lụt
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Tuyến đường an toàn
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {inference_time_ms} ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> {model_used}
              </span>
            </div>
          </div>

          {/* Depth Measurement & Confidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                <Gauge className="w-3.5 h-3.5 text-blue-600" /> Độ sâu ước tính (VLRDR)
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {reading.depth_estimate_cm_min} – {reading.depth_estimate_cm_max}{" "}
                <span className="text-sm font-semibold text-slate-500">cm</span>
              </div>
            </div>

            <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1 flex justify-between">
                <span>Độ tin cậy AI</span>
                <span className="font-semibold text-slate-700">{Math.round(reading.confidence_score * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${reading.confidence_score * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alert Message */}
          <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-xl text-sm font-medium text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Cảnh báo: </span>
              {reading.alert_message}
            </div>
          </div>

          {/* Reference Landmarks */}
          {reading.reference_objects_used && reading.reference_objects_used.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Mốc vật lý làm thước đo (Landmarks):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reading.reference_objects_used.map((ref, i) => (
                  <span
                    key={i}
                    className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-medium"
                  >
                    🔍 {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200 text-sm text-slate-700">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Suy luận thị giác (Visual Reasoning):
            </div>
            <p className="leading-relaxed text-slate-800">{reading.reasoning}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
