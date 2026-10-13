import React from "react";
import { QueueHistoryItem } from "../types";

interface QueueTaskAnalysisSectionProps {
  task: QueueHistoryItem;
  cacheBuster: number;
  apiUrl: string;
}

export const QueueTaskAnalysisSection: React.FC<QueueTaskAnalysisSectionProps> = ({
  task,
  cacheBuster,
  apiUrl,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div className="md:col-span-7 space-y-4">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đánh Giá Ngập Nước (VLRDR)</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black ${
                (task.depth_level || 0) >= 3
                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                  : (task.depth_level || 0) >= 1
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}
            >
              Level {task.depth_level || 0}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {task.depth_estimate_cm_max ? `${task.depth_estimate_cm_min} - ${task.depth_estimate_cm_max} cm` : "0 cm (Khô ráo)"}
            </span>
            {task.confidence_score !== null && task.confidence_score !== undefined && (
              <span className="text-xs text-slate-500 font-medium">
                (Độ tin cậy: {Math.round((task.confidence_score || 0) * 100)}%)
              </span>
            )}
          </div>

          {task.alert_message && (
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Thông báo cảnh báo:</span>
              {task.alert_message}
            </div>
          )}

          {task.reference_objects && task.reference_objects.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Vật thể tham chiếu:</span>
              <div className="flex flex-wrap gap-1.5">
                {task.reference_objects.map((obj: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-100">
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.reasoning && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Lập luận phân tích của AI:</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                {task.reasoning}
              </p>
            </div>
          )}

          {task.error_message && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <span className="font-bold block mb-0.5">Lỗi ghi nhận:</span>
              {task.error_message}
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-5 space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Ảnh Khung Hình Phân Tích</span>
          {task.camera_id ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-slate-200 shadow-inner">
              <img
                src={`${apiUrl}/api/v1/cameras/${task.camera_id}/snapshot?t=${cacheBuster}`}
                alt="Camera Frame"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                {task.camera_id}
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
              Ảnh tải lên Demo
            </div>
          )}

          <div className="mt-3 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Góc camera:</span>
              <span className="font-bold text-slate-800">{task.camera_angle || "elevated"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vị trí:</span>
              <span className="font-bold text-slate-800 truncate max-w-[180px]">{task.location_hint || "TP. Hồ Chí Minh"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Thời gian tạo:</span>
              <span className="font-mono text-[11px] text-slate-700">
                {task.created_at ? new Date(task.created_at).toLocaleString("vi-VN") : "N/A"}
              </span>
            </div>
            {task.completed_at && (
              <div className="flex justify-between">
                <span className="text-slate-400">Hoàn thành:</span>
                <span className="font-mono text-[11px] text-slate-700">
                  {new Date(task.completed_at).toLocaleString("vi-VN")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
