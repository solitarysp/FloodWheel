import React from "react";
import { Sparkles } from "lucide-react";
import { CameraToolbar } from "../camera/CameraToolbar";
import { CameraTable } from "../camera/CameraTable";
import { CameraGrid } from "../camera/CameraGrid";

interface CamerasTabProps {
  cameraSearch: string;
  setCameraSearch: (v: string) => void;
  cameraStatusFilter: string;
  setCameraStatusFilter: (v: string) => void;
  cameraViewMode: "table" | "grid";
  setCameraViewMode: (v: "table" | "grid") => void;
  selectedCameraIds: string[];
  isBatchAnalyzing: boolean;
  onBatchAnalyze: (ids?: string[]) => void;
  filteredCameras: any[];
  onRefreshCache: () => void;
  onClearAllReadings: () => void;
  actionLoading: string | null;
  onSelectNone: () => void;
  toggleSelectAll: () => void;
  toggleSelectCamera: (id: string) => void;
  setPreviewCameraSnapshot: (cam: any) => void;
  apiUrl: string;
  cacheBuster: number;
  handleAnalyzeCamera: (id: string) => void;
  analyzingCameraId: string | null;
  handleUpdateCameraStatus: (id: string, status: string) => void;
  handleDeleteCameraReading: (id: string, name?: string) => void;
  handleDeleteCamera: (id: string, name: string) => void;
}

export const CamerasTab: React.FC<CamerasTabProps> = ({
  cameraSearch,
  setCameraSearch,
  cameraStatusFilter,
  setCameraStatusFilter,
  cameraViewMode,
  setCameraViewMode,
  selectedCameraIds,
  isBatchAnalyzing,
  onBatchAnalyze,
  filteredCameras,
  onRefreshCache,
  onClearAllReadings,
  actionLoading,
  onSelectNone,
  toggleSelectAll,
  toggleSelectCamera,
  setPreviewCameraSnapshot,
  apiUrl,
  cacheBuster,
  handleAnalyzeCamera,
  analyzingCameraId,
  handleUpdateCameraStatus,
  handleDeleteCameraReading,
  handleDeleteCamera,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <CameraToolbar
        cameraSearch={cameraSearch}
        setCameraSearch={setCameraSearch}
        cameraStatusFilter={cameraStatusFilter}
        setCameraStatusFilter={setCameraStatusFilter}
        cameraViewMode={cameraViewMode}
        setCameraViewMode={setCameraViewMode}
        selectedCameraIds={selectedCameraIds}
        isBatchAnalyzing={isBatchAnalyzing}
        onBatchAnalyze={onBatchAnalyze}
        filteredCameras={filteredCameras}
        onRefreshCache={onRefreshCache}
        onClearAllReadings={onClearAllReadings}
        actionLoading={actionLoading}
      />

      {/* Active Selection Banner */}
      {selectedCameraIds.length > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              Selected <strong className="text-orange-600 font-bold">{selectedCameraIds.length}</strong> cameras for batch AI analysis
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBatchAnalyze()}
              disabled={isBatchAnalyzing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBatchAnalyzing ? "animate-spin" : ""}`} />
              <span>{isBatchAnalyzing ? "Processing..." : `🔥 Run AI Scan (${selectedCameraIds.length})`}</span>
            </button>
            <button
              onClick={onSelectNone}
              className="px-2.5 py-1.5 rounded-xl bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition font-medium text-[11px]"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Camera List or Grid */}
      {filteredCameras.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400">
          No cameras match the current filter.
        </div>
      ) : cameraViewMode === "table" ? (
        <CameraTable
          filteredCameras={filteredCameras}
          selectedCameraIds={selectedCameraIds}
          toggleSelectAll={toggleSelectAll}
          toggleSelectCamera={toggleSelectCamera}
          setPreviewCameraSnapshot={setPreviewCameraSnapshot}
          apiUrl={apiUrl}
          cacheBuster={cacheBuster}
          handleAnalyzeCamera={handleAnalyzeCamera}
          analyzingCameraId={analyzingCameraId}
          handleUpdateCameraStatus={handleUpdateCameraStatus}
          handleDeleteCameraReading={handleDeleteCameraReading}
          handleDeleteCamera={handleDeleteCamera}
          actionLoading={actionLoading}
        />
      ) : (
        <CameraGrid
          filteredCameras={filteredCameras}
          selectedCameraIds={selectedCameraIds}
          toggleSelectCamera={toggleSelectCamera}
          setPreviewCameraSnapshot={setPreviewCameraSnapshot}
          apiUrl={apiUrl}
          cacheBuster={cacheBuster}
          handleAnalyzeCamera={handleAnalyzeCamera}
          analyzingCameraId={analyzingCameraId}
          handleUpdateCameraStatus={handleUpdateCameraStatus}
          handleDeleteCameraReading={handleDeleteCameraReading}
          handleDeleteCamera={handleDeleteCamera}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};
