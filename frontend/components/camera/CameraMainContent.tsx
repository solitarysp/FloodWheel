import React from "react";
import { Camera as CameraIcon } from "lucide-react";
import { Camera, CameraCard } from "../CameraCard";
import { AnalysisResponse } from "../CameraAnalysisModal";

interface CameraMainContentProps {
  loading: boolean;
  viewMode: "map" | "grid";
  filteredCameras: Camera[];
  cacheBuster: number;
  analyzingId: string | null;
  isBatchAnalyzing: boolean;
  onAnalyze: (camera: Camera, capturedFrameBase64?: string) => Promise<void>;
  onBatchAnalyze: () => Promise<void>;
  onResetFilters: () => void;
  CameraMapComponent: React.ComponentType<any>;
}

export const CameraMainContent: React.FC<CameraMainContentProps> = ({
  loading,
  viewMode,
  filteredCameras,
  cacheBuster,
  analyzingId,
  isBatchAnalyzing,
  onAnalyze,
  onBatchAnalyze,
  onResetFilters,
  CameraMapComponent,
}) => {
  if (loading) {
    if (viewMode === "map") {
      return (
        <div className="w-full h-[620px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800 animate-pulse">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Loading Surveillance Map...</span>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="aspect-video bg-slate-200 rounded-xl" />
            <div className="h-8 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredCameras.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
        <CameraIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Cameras Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No traffic cameras matched your current filter or search criteria. Try selecting another district or
          resetting search.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  if (viewMode === "map") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-700">{filteredCameras.length}</strong> cameras on interactive map. Click a marker to inspect snapshot or run AI analysis.
          </span>
          <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Cluster-Enabled 60fps
          </span>
        </div>
        <CameraMapComponent
          cameras={filteredCameras}
          onAnalyze={onAnalyze}
          onBatchAnalyze={onBatchAnalyze}
          isBatchAnalyzing={isBatchAnalyzing}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCameras.map((camera) => (
        <CameraCard
          key={camera.id}
          camera={camera}
          cacheBuster={cacheBuster}
          onAnalyze={onAnalyze}
          isAnalyzing={analyzingId === camera.id}
        />
      ))}
    </div>
  );
};
