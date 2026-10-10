import React, { useState } from "react";
import { AlertTriangle, Clock, X, ShieldAlert, Check } from "lucide-react";

interface OverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  zoneId: string;
  zoneName: string;
  currentLevel: number;
  onSuccess: () => void;
}

export const OverrideDialog: React.FC<OverrideDialogProps> = ({
  isOpen,
  onClose,
  zoneId,
  zoneName,
  currentLevel,
  onSuccess,
}) => {
  const [level, setLevel] = useState<number>(currentLevel);
  const [cmMin, setCmMin] = useState<number>(30);
  const [cmMax, setCmMax] = useState<number>(45);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [reason, setReason] = useState<string>("Báo cáo thực địa từ đội tuần tra thoát nước đô thị");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const resp = await fetch(`${apiUrl}/api/v1/admin/zones/${zoneId}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: "op-hcmc-central",
          override_depth_level: level,
          depth_cm_min: cmMin,
          depth_cm_max: cmMax,
          reason,
          duration_hours: durationHours,
        }),
      });

      if (!resp.ok) {
        throw new Error("Không thể cập nhật can thiệp thủ công.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-600 mb-2">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="text-lg font-bold text-slate-900">Can thiệp Điều hành Thủ công (Override)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Khu vực: <span className="font-semibold text-slate-800">{zoneName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mức độ ngập ghi đè (0 – 5)
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white"
            >
              <option value={0}>Level 0: Khô ráo (0cm)</option>
              <option value={1}>Level 1: Vũng nước nhỏ (5-15cm)</option>
              <option value={2}>Level 2: Chú ý (15-30cm)</option>
              <option value={3}>Level 3: Nguy hiểm — Chìm ống xả (30-45cm)</option>
              <option value={4}>Level 4: Ngập sâu — Chìm yên xe (45-70cm)</option>
              <option value={5}>Level 5: Khẩn cấp — Ngập lút (&gt;70cm)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Độ sâu min (cm)</label>
              <input
                type="number"
                value={cmMin}
                onChange={(e) => setCmMin(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Độ sâu max (cm)</label>
              <input
                type="number"
                value={cmMax}
                onChange={(e) => setCmMax(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian hiệu lực (Giờ)</label>
            <input
              type="number"
              min={1}
              max={24}
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do can thiệp</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          {error && <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20"
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận Can thiệp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
