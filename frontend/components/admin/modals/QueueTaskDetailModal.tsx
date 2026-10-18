import React from "react";
import { FileText, X } from "lucide-react";
import { QueueHistoryItem } from "../types";
import { QueueTaskTechnicalAudit } from "./QueueTaskTechnicalAudit";
import { QueueTaskAnalysisSection } from "./QueueTaskAnalysisSection";

interface QueueTaskDetailModalProps {
  task: QueueHistoryItem | null;
  onClose: () => void;
  cacheBuster: number;
  apiUrl: string;
}

export const QueueTaskDetailModal: React.FC<QueueTaskDetailModalProps> = ({
  task,
  onClose,
  cacheBuster,
  apiUrl,
}) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700">
                  #{task.id}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    task.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : task.status === "SKIPPED"
                      ? "bg-slate-100 text-slate-600"
                      : task.status === "PROCESSING"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {task.status}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {task.task_type === "cycle_camera"
                    ? `Auto Cycle #${task.cycle_id || 1}`
                    : task.task_type === "single_camera"
                    ? "Direct Camera Scan"
                    : task.task_type === "image_upload"
                    ? "Demo Upload"
                    : "Batch Camera Scan"}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                AI Task Details: {task.camera_name || task.camera_id || "Frame"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Queue Wait</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {task.queue_wait_ms !== null && task.queue_wait_ms !== undefined ? `${task.queue_wait_ms} ms` : "0 ms"}
              </div>
              <span className="text-[10px] text-slate-400 block">Queue latency</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">AI Latency</span>
              <div className="text-lg font-black text-indigo-700 mt-0.5">
                {task.inference_time_ms !== null && task.inference_time_ms !== undefined ? `${task.inference_time_ms} ms` : "0 ms"}
              </div>
              <span className="text-[10px] text-indigo-500 block">Gemini inference time</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Duration</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {task.duration_ms !== null && task.duration_ms !== undefined ? `${task.duration_ms} ms` : "0 ms"}
              </div>
              <span className="text-[10px] text-slate-400 block">Queue + Stream + AI</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Model & Tokens</span>
              <div className="text-sm font-black text-slate-800 mt-0.5 truncate" title={task.model_used || "N/A"}>
                {task.model_used || "N/A"}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {task.tokens_used ? `${task.tokens_used} tokens` : "0 tokens"}
              </span>
            </div>
          </div>

          <QueueTaskAnalysisSection task={task} cacheBuster={cacheBuster} apiUrl={apiUrl} />

          <QueueTaskTechnicalAudit rawResponse={task.raw_response} promptPreview={task.prompt_preview} />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
