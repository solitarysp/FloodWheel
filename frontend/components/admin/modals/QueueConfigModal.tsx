import React from "react";
import { Settings as SettingsIcon, X, Check, RefreshCw } from "lucide-react";

interface QueueConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  configIntervalMinutes: number;
  setConfigIntervalMinutes: (v: number) => void;
  configMaxCameras: number;
  setConfigMaxCameras: (v: number) => void;
  actionLoading: string | null;
  onSave: () => void;
}

export const QueueConfigModal: React.FC<QueueConfigModalProps> = ({
  isOpen,
  onClose,
  configIntervalMinutes,
  setConfigIntervalMinutes,
  configMaxCameras,
  setConfigMaxCameras,
  actionLoading,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Queue Cycle Configuration</h3>
              <p className="text-xs text-slate-500">Customize schedule intervals and camera limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Interval Between Scan Cycles (Minutes):
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={configIntervalMinutes}
              onChange={(e) => setConfigIntervalMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default: 30 minutes. The next cycle counts down after the current batch finishes.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Cameras to Scan Per Cycle:
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={configMaxCameras}
              onChange={(e) => setConfigMaxCameras(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              The system uses Round-Robin rotation based on cameras least recently analyzed.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={actionLoading === "config"}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
          >
            {actionLoading === "config" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
