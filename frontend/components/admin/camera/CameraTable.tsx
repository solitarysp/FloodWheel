import React from "react";
import { Eye, Sparkles, RotateCcw, Trash2, Clock } from "lucide-react";

interface CameraTableProps {
  filteredCameras: any[];
  selectedCameraIds: string[];
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
  actionLoading: string | null;
}

export const CameraTable: React.FC<CameraTableProps> = ({
  filteredCameras,
  selectedCameraIds,
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
  actionLoading,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
            <th className="pb-3 w-8">
              <input
                type="checkbox"
                checked={
                  filteredCameras.length > 0 &&
                  filteredCameras.every((c) => selectedCameraIds.includes(c.id))
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                title="Chọn tất cả camera"
              />
            </th>
            <th className="pb-3 w-32">Ảnh Lưu Trữ</th>
            <th className="pb-3">Tên Camera</th>
            <th className="pb-3">Vị Trí / Quận</th>
            <th className="pb-3">Trạng Thái</th>
            <th className="pb-3">Mức Ngập Gần Nhất</th>
            <th className="pb-3 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {filteredCameras.map((cam) => (
            <tr
              key={cam.id}
              className={`hover:bg-slate-50/50 transition-colors ${
                selectedCameraIds.includes(cam.id) ? "bg-amber-50/40" : ""
              }`}
            >
              <td className="py-3 pr-2">
                <input
                  type="checkbox"
                  checked={selectedCameraIds.includes(cam.id)}
                  onChange={() => toggleSelectCamera(cam.id)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                />
              </td>

              <td className="py-3 pr-4">
                <div
                  onClick={() => setPreviewCameraSnapshot(cam)}
                  className="relative w-28 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-xs shrink-0"
                  title="Nhấn để xem ảnh chụp phóng to"
                >
                  <img
                    src={`${apiUrl}/api/v1/cameras/${cam.id}/snapshot?t=${cacheBuster}`}
                    alt={cam.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='90' viewBox='0 0 160 90' fill='%231e293b'><rect width='160' height='90' fill='%230f172a'/><text x='50%' y='50%' fill='%2364748b' font-size='11' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>Mất tín hiệu</text></svg>";
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                    <Eye className="w-4 h-4 drop-shadow" />
                    <span className="text-[10px] font-bold drop-shadow">Xem</span>
                  </div>
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[8px] font-mono text-white/90">
                    SNAPSHOT
                  </div>
                </div>
              </td>

              <td className="py-3">
                <span className="font-bold text-slate-900 block">{cam.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{cam.id}</span>
              </td>
              <td className="py-3 text-slate-600">{cam.location || "TP. Hồ Chí Minh"}</td>
              <td className="py-3">
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                    cam.status === "ONLINE"
                      ? "bg-emerald-100 text-emerald-700"
                      : cam.status === "MAINTENANCE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {cam.status}
                </span>
              </td>

              <td className="py-3">
                {cam.latest_reading?.alert_message === "Đang chờ ảnh từ cam" ? (
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 inline-flex items-center gap-1.5 shadow-xs"
                    title="Ảnh camera là ảnh mock/mất tín hiệu, AI tạm bỏ qua để chờ ảnh thực tế từ camera"
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Đang chờ ảnh từ cam</span>
                  </span>
                ) : cam.latest_reading ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cam.latest_reading.depth_level >= 3
                        ? "bg-rose-100 text-rose-700"
                        : cam.latest_reading.depth_level >= 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    Level {cam.latest_reading.depth_level}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px]">Chưa quét</span>
                )}
              </td>

              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleAnalyzeCamera(cam.id)}
                    disabled={analyzingCameraId === cam.id}
                    title="Phân tích AI ngay cho camera này"
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-xs ${
                      analyzingCameraId === cam.id
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/20"
                    }`}
                  >
                    <Sparkles
                      className={`w-3 h-3 ${analyzingCameraId === cam.id ? "animate-spin" : ""}`}
                    />
                    <span>{analyzingCameraId === cam.id ? "Đang quét..." : "Quét AI"}</span>
                  </button>

                  <button
                    onClick={() => setPreviewCameraSnapshot(cam)}
                    title="Xem ảnh chi tiết"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {cam.status !== "ONLINE" && (
                    <button
                      onClick={() => handleUpdateCameraStatus(cam.id, "ONLINE")}
                      className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                    >
                      Bật Online
                    </button>
                  )}
                  {cam.status !== "OFFLINE" && (
                    <button
                      onClick={() => handleUpdateCameraStatus(cam.id, "OFFLINE")}
                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold"
                    >
                      Tắt Offline
                    </button>
                  )}
                  {cam.status !== "MAINTENANCE" && (
                    <button
                      onClick={() => handleUpdateCameraStatus(cam.id, "MAINTENANCE")}
                      className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold"
                    >
                      Bảo Trì
                    </button>
                  )}

                  {cam.latest_reading && (
                    <button
                      onClick={() => handleDeleteCameraReading(cam.id, cam.name)}
                      disabled={actionLoading === `del-reading-${cam.id}`}
                      title="Xóa kết quả phân tích AI của camera này"
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteCamera(cam.id, cam.name)}
                    title="Xóa camera"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
