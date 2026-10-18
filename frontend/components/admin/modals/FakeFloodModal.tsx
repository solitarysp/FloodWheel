import React, { useState } from "react";
import { Zap, X, AlertCircle } from "lucide-react";

interface FakeFloodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (floodedCount: number, dryCount: number) => Promise<void>;
  isLoading: boolean;
  totalCamerasCount?: number;
}

export const FakeFloodModal: React.FC<FakeFloodModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  totalCamerasCount = 20,
}) => {
  const [floodedCount, setFloodedCount] = useState<number>(5);
  const [dryCount, setDryCount] = useState<number>(5);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(floodedCount, dryCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Simulate AI Flood Test</h3>
              <p className="text-[11px] text-slate-500">Configure simulated flood vs dry detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            {/* Flooded Cameras Input */}
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-2">
              <label className="block text-xs font-bold text-rose-900">
                🌊 Flooded Cameras
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={floodedCount}
                onChange={(e) => setFloodedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-center text-lg font-black text-rose-700 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none"
                required
              />
              <span className="block text-[10px] text-rose-600/80 text-center font-medium">Level 1 - 3 alerts</span>
            </div>

            {/* Dry Cameras Input */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
              <label className="block text-xs font-bold text-emerald-900">
                ☀️ Dry Cameras
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={dryCount}
                onChange={(e) => setDryCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-center text-lg font-black text-emerald-700 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                required
              />
              <span className="block text-[10px] text-emerald-600/80 text-center font-medium">Level 0 (Normal)</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] leading-relaxed">
              Total simulation target: <strong>{floodedCount + dryCount} cameras</strong> (out of available {totalCamerasCount} cameras). Affected zones will be re-aggregated automatically.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || floodedCount + dryCount === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Zap className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Generating Data..." : "Generate Test Data"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
