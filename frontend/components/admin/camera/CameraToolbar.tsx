import React from "react";
import { Search, List, LayoutGrid, Flame, Sparkles, RefreshCw, Trash2, PlusCircle } from "lucide-react";

interface CameraToolbarProps {
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
  onOpenAddCamera: () => void;
}

export const CameraToolbar: React.FC<CameraToolbarProps> = ({
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
  onOpenAddCamera,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3 flex-1 max-w-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={cameraSearch}
            onChange={(e) => setCameraSearch(e.target.value)}
            placeholder="Tìm theo tên, ID, quận..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={cameraStatusFilter}
          onChange={(e) => setCameraStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Bảo trì</option>
        </select>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setCameraViewMode("table")}
            title="Dạng bảng chi tiết"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              cameraViewMode === "table"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bảng</span>
          </button>
          <button
            onClick={() => setCameraViewMode("grid")}
            title="Dạng lưới ảnh snapshot"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              cameraViewMode === "grid"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lưới ảnh</span>
          </button>
        </div>

        <button
          onClick={() => onBatchAnalyze()}
          disabled={isBatchAnalyzing || selectedCameraIds.length === 0}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 ${
            selectedCameraIds.length > 0
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-orange-500/30 ring-2 ring-orange-400/40 animate-pulse"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          }`}
          title={
            selectedCameraIds.length > 0
              ? `Kích hoạt phân tích AI ngay lập tức cho ${selectedCameraIds.length} camera đã chọn`
              : "Chọn camera bằng checkbox để kích hoạt phân tích AI"
          }
        >
          <Flame className={`w-3.5 h-3.5 ${isBatchAnalyzing ? "animate-bounce text-yellow-200" : "text-amber-200"}`} />
          <span>
            {isBatchAnalyzing
              ? "Đang quét AI..."
              : selectedCameraIds.length > 0
              ? `🔥 Phân Tích AI (${selectedCameraIds.length})`
              : "🔥 Phân Tích AI"}
          </span>
        </button>

        <button
          onClick={() => onBatchAnalyze(filteredCameras.map((c) => c.id))}
          disabled={isBatchAnalyzing || filteredCameras.length === 0}
          title={`Quét AI toàn bộ ${filteredCameras.length} camera đang hiển thị`}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span className="hidden xl:inline">Quét Tất Cả ({filteredCameras.length})</span>
        </button>

        <button
          onClick={onRefreshCache}
          title="Làm mới toàn bộ ảnh chụp camera"
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Làm mới ảnh</span>
        </button>

        <button
          onClick={onClearAllReadings}
          disabled={actionLoading === "clear-readings"}
          title="Xóa toàn bộ kết quả phân tích AI và đặt lại các khu vực về Level 0"
          className="p-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden sm:inline">{actionLoading === "clear-readings" ? "Đang xóa..." : "Xóa All Kết Quả"}</span>
        </button>

        <button
          onClick={onOpenAddCamera}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Thêm Camera</span>
        </button>
      </div>
    </div>
  );
};
