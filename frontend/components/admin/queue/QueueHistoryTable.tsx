import React from "react";
import { Eye } from "lucide-react";
import { QueueHistoryItem } from "../types";

interface QueueHistoryTableProps {
  queueHistory: QueueHistoryItem[];
  queueHistoryLoading: boolean;
  isDetailModalLoading: boolean;
  onViewDetail: (id: string) => void;
}

export const QueueHistoryTable: React.FC<QueueHistoryTableProps> = ({
  queueHistory,
  queueHistoryLoading,
  isDetailModalLoading,
  onViewDetail,
}) => {
  if (queueHistoryLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Loading queue history from PostgreSQL...</span>
      </div>
    );
  }

  if (queueHistory.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        No AI calls recorded in the database yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
            <th className="pb-3 px-3">Task</th>
            <th className="pb-3 px-3">Camera / Frame</th>
            <th className="pb-3 px-3">Flood Level & Depth</th>
            <th className="pb-3 px-3">Model & Latency</th>
            <th className="pb-3 px-3">Queue Wait</th>
            <th className="pb-3 px-3">Status</th>
            <th className="pb-3 px-3 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {queueHistory.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/70 transition">
              <td className="py-3 px-3 whitespace-nowrap">
                <span className="font-mono text-[11px] font-bold text-slate-500 mr-1.5">#{item.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  {item.task_type === "cycle_camera" ? `Cycle #${item.cycle_id || 1}` : item.task_type}
                </span>
              </td>
              <td className="py-3 px-3 max-w-[200px]">
                <div className="font-bold text-slate-900 truncate" title={item.camera_name || item.camera_id || "Frame"}>
                  {item.camera_name || item.camera_id || "Frame"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{item.camera_id}</div>
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                {item.status === "COMPLETED" && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (item.depth_level || 0) >= 3
                          ? "bg-rose-100 text-rose-700"
                          : (item.depth_level || 0) >= 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      Level {item.depth_level || 0}
                    </span>
                    <span className="text-slate-600 font-semibold text-[11px]">
                      {item.depth_estimate_cm_max ? `${item.depth_estimate_cm_max}cm` : "0cm"}
                    </span>
                  </div>
                )}
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <div className="text-slate-700 font-semibold text-[11px] truncate max-w-[120px]">
                  {item.model_used === "cache-hit" ? <span className="text-blue-600 font-bold">Cache-Hit</span> : item.model_used || "Gemini AI"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {item.inference_time_ms ? `${item.inference_time_ms}ms` : "-"}
                  {item.tokens_used ? ` • ${item.tokens_used} tok` : ""}
                </div>
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <div className="text-slate-700 font-mono text-[11px]">
                  {item.queue_wait_ms !== null && item.queue_wait_ms !== undefined ? `${item.queue_wait_ms}ms` : "-"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {item.duration_ms !== null && item.duration_ms !== undefined ? `Total ${item.duration_ms}ms` : ""}
                </div>
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  item.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "SKIPPED"
                    ? "bg-slate-100 text-slate-600"
                    : item.status === "PROCESSING"
                    ? "bg-indigo-100 text-indigo-700 animate-pulse"
                    : item.status === "QUEUED"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-rose-100 text-rose-700"
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="py-3 px-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onViewDetail(String(item.id))}
                  disabled={isDetailModalLoading}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
