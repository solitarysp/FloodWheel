import React, { useState } from "react";
import { ImageIcon, RefreshCw, FolderSearch, Sparkles } from "lucide-react";
import { BenchmarkItem } from "@/data/benchmarkDataset";

interface DemoUploadActionsProps {
  isLoading: boolean;
  hasSelectedFiles: boolean;
  onOpenGallery: () => void;
  onLoadPreset: () => void;
}

export const DemoUploadActions: React.FC<DemoUploadActionsProps> = ({
  isLoading,
  hasSelectedFiles,
  onOpenGallery,
  onLoadPreset,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenGallery}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition shadow-xs"
        >
          <FolderSearch className="w-4 h-4 text-blue-600" />
          <span>20 Real Benchmark Images (Dataset)</span>
        </button>

        <button
          type="button"
          onClick={onLoadPreset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Quick Load Preset</span>
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading || !hasSelectedFiles}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI scanning physical landmarks...</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            <span>Analyze Flood Depth (Gemini VLRDR)</span>
          </>
        )}
      </button>
    </div>
  );
};
