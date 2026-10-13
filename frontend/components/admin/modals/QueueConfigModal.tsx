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
              <h3 className="text-base font-bold text-slate-900">Cấu Hình Chu Kỳ Quét AI</h3>
              <p className="text-xs text-slate-500">Tùy chỉnh lịch trình quét và số lượng camera</p>
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
              Khoảng cách giữa các chu kỳ quét (Phút):
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
              Mặc định: 30 phút. Chu kỳ tiếp theo sẽ đếm ngược sau khi đợt quét hiện tại hoàn tất.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng camera quét tối đa mỗi chu kỳ:
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
              Hệ thống tự động luân phiên (Round-Robin) dựa trên camera được quét xa nhất trong quá khứ.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Hủy Bỏ
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
            <span>Lưu Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
