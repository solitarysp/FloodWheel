import React from "react";
import { Sliders, Check, Copy } from "lucide-react";

interface QueueTaskTechnicalAuditProps {
  rawResponse?: string;
  promptPreview?: string;
}

export const QueueTaskTechnicalAudit: React.FC<QueueTaskTechnicalAuditProps> = ({
  rawResponse,
  promptPreview,
}) => {
  const [copiedRaw, setCopiedRaw] = React.useState<boolean>(false);

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          <span>Dữ Liệu Kỹ Thuật & Raw Response từ AI</span>
        </span>
        {rawResponse && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(rawResponse);
              setCopiedRaw(true);
              setTimeout(() => setCopiedRaw(false), 2000);
            }}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center gap-1 transition"
          >
            {copiedRaw ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRaw ? "Đã sao chép!" : "Sao chép Raw Response"}</span>
          </button>
        )}
      </div>

      {promptPreview && (
        <div>
          <span className="text-[10px] font-bold text-slate-400 block mb-1">Prompt Preview:</span>
          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-32">
            {promptPreview}
          </div>
        </div>
      )}

      {rawResponse && (
        <div>
          <span className="text-[10px] font-bold text-slate-400 block mb-1">Raw Gemini Model Output:</span>
          <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
            {rawResponse}
          </pre>
        </div>
      )}
    </div>
  );
};
