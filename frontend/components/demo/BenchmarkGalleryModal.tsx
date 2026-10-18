import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { BENCHMARK_ITEMS, BenchmarkItem } from "@/data/benchmarkDataset";

interface BenchmarkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (item: BenchmarkItem) => void;
}

export const BenchmarkGalleryModal: React.FC<BenchmarkGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
}) => {
  const [galleryTab, setGalleryTab] = useState<"flooded" | "non-flooded">("flooded");

  if (!isOpen) return null;

  const filteredBenchmark = BENCHMARK_ITEMS.filter((i) => i.category === galleryTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            20 Real-World Benchmark Scenarios (Urban Streets & Flooding)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any benchmark image to evaluate Gemini's VLRDR landmark relative depth reasoning
          </p>

          {/* Tabs */}
          <div className="flex gap-3 mt-4 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setGalleryTab("flooded")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                galleryTab === "flooded"
                  ? "bg-rose-50 text-rose-700 border border-rose-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>10 Inundated Scenarios (Levels 2–4)</span>
            </button>

            <button
              type="button"
              onClick={() => setGalleryTab("non-flooded")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                galleryTab === "non-flooded"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>10 Dry Street Scenarios (Level 0)</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
          {filteredBenchmark.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectImage(item)}
              className="rounded-2xl border border-slate-200 p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition flex gap-3 group bg-slate-50/50 hover:bg-white"
            >
              <div className="w-24 h-24 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative border border-slate-300">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
                <span
                  className={`absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                    item.depth_level >= 3
                      ? "bg-rose-600"
                      : item.depth_level > 0
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                >
                  L{item.depth_level}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500">{item.location}</p>
                <div className="text-[11px] font-semibold text-slate-700">
                  {item.depth_level > 0
                    ? `Est: ${item.depth_cm_min}–${item.depth_cm_max} cm`
                    : "Dry Road (0 cm)"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Landmarks: {item.landmarks.join(", ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Source: Curated Urban Traffic Imagery (Creative Commons Attribution)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
