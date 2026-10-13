import React from "react";
import { Search, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { QueueHistoryStats, QueueHistoryItem } from "../types";
import { QueueHistoryTable } from "./QueueHistoryTable";

interface QueueHistorySectionProps {
  queueHistoryStats: QueueHistoryStats;
  queueHistoryStatusFilter: string;
  setQueueHistoryStatusFilter: (v: string) => void;
  queueHistoryTypeFilter: string;
  setQueueHistoryTypeFilter: (v: string) => void;
  queueHistorySearch: string;
  setQueueHistorySearch: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  queueHistory: QueueHistoryItem[];
  queueHistoryLoading: boolean;
  isDetailModalLoading: boolean;
  onViewDetail: (id: string) => void;
  queueHistoryTotal: number;
  queueHistoryPage: number;
  queueHistoryPageSize: number;
  queueHistoryTotalPages: number;
  onPageChange: (newPage: number) => void;
  onClearHistory: () => void;
  actionLoading: string | null;
  onRefresh: () => void;
}

export const QueueHistorySection: React.FC<QueueHistorySectionProps> = ({
  queueHistoryStats,
  queueHistoryStatusFilter,
  setQueueHistoryStatusFilter,
  queueHistoryTypeFilter,
  setQueueHistoryTypeFilter,
  queueHistorySearch,
  setQueueHistorySearch,
  onSearchSubmit,
  queueHistory,
  queueHistoryLoading,
  isDetailModalLoading,
  onViewDetail,
  queueHistoryTotal,
  queueHistoryPage,
  queueHistoryPageSize,
  queueHistoryTotalPages,
  onPageChange,
  onClearHistory,
  actionLoading,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Lịch Sử Chi Tiết Các Lệnh Gọi AI Trong Database (AI Queue Audit History)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tất cả lệnh gọi AI từ chu kỳ tự động, quét trực tiếp camera, và tải ảnh demo đều được đưa vào hàng đợi và lưu trữ chi tiết vào PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={onRefresh}
            disabled={queueHistoryLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Làm mới bảng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${queueHistoryLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={onClearHistory}
            disabled={actionLoading === "clear-history"}
            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Lịch Sử</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tổng Lệnh AI</span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{queueHistoryStats.total_calls}</span>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Thành Công</span>
          <span className="text-lg font-black text-emerald-700 mt-0.5 block">{queueHistoryStats.completed_count}</span>
        </div>
        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
          <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">Điểm Ngập</span>
          <span className="text-lg font-black text-rose-700 mt-0.5 block">{queueHistoryStats.flooded_count}</span>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
          <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Bỏ Qua</span>
          <span className="text-lg font-black text-amber-700 mt-0.5 block">{queueHistoryStats.skipped_count}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Thất Bại</span>
          <span className="text-lg font-black text-slate-700 mt-0.5 block">{queueHistoryStats.failed_count}</span>
        </div>
        <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">Độ Trễ TB</span>
          <span className="text-lg font-black text-indigo-700 mt-0.5 block">{queueHistoryStats.avg_inference_ms} ms</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={queueHistorySearch}
            onChange={(e) => setQueueHistorySearch(e.target.value)}
            placeholder="Tìm theo camera ID, tên đường, model..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={queueHistoryStatusFilter}
            onChange={(e) => setQueueHistoryStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="COMPLETED">Completed</option>
            <option value="SKIPPED">Skipped</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
          </select>

          <select
            value={queueHistoryTypeFilter}
            onChange={(e) => setQueueHistoryTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">Tất cả loại tác vụ</option>
            <option value="cycle_camera">Chu kỳ tự động</option>
            <option value="single_camera">Quét trực tiếp</option>
            <option value="image_upload">Tải ảnh demo</option>
            <option value="batch_camera">Quét hàng loạt</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <QueueHistoryTable
        queueHistory={queueHistory}
        queueHistoryLoading={queueHistoryLoading}
        isDetailModalLoading={isDetailModalLoading}
        onViewDetail={onViewDetail}
      />

      {/* Pagination Footer */}
      {queueHistoryTotal > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div>
            Hiển thị <strong>{Math.min(queueHistoryTotal, (queueHistoryPage - 1) * queueHistoryPageSize + 1)}</strong> -{" "}
            <strong>{Math.min(queueHistoryTotal, queueHistoryPage * queueHistoryPageSize)}</strong> trên tổng số{" "}
            <strong>{queueHistoryTotal}</strong> lệnh gọi AI
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(queueHistoryPage - 1)}
              disabled={queueHistoryPage <= 1 || queueHistoryLoading}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-2">
              Trang {queueHistoryPage} / {queueHistoryTotalPages}
            </span>
            <button
              onClick={() => onPageChange(queueHistoryPage + 1)}
              disabled={queueHistoryPage >= queueHistoryTotalPages || queueHistoryLoading}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition"
              title="Trang tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
