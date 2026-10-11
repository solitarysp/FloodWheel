import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Navbar } from "../components/Navbar";
import { AdminLoginModal } from "../components/AdminLoginModal";
import { AddCameraModal } from "../components/AddCameraModal";
import { OverrideDialog } from "../components/OverrideDialog";
import { adminFetch, getAdminUser, isAdminAuthenticated } from "../lib/auth";
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  Camera,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  AlertTriangle,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Activity,
  LogOut,
  Settings as SettingsIcon,
  Check,
  Eye,
  Maximize2,
  LayoutGrid,
  List,
  ExternalLink,
  Image as ImageIcon,
  X,
} from "lucide-react";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"queue" | "cameras" | "overrides" | "alerts">("queue");

  // Overview stats & data
  const [overview, setOverview] = useState<any>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [isAddCameraOpen, setIsAddCameraOpen] = useState<boolean>(false);
  const [selectedZoneForOverride, setSelectedZoneForOverride] = useState<any>(null);

  // Filters & search
  const [cameraSearch, setCameraSearch] = useState<string>("");
  const [cameraStatusFilter, setCameraStatusFilter] = useState<string>("all");
  const [cameraViewMode, setCameraViewMode] = useState<"table" | "grid">("table");
  const [previewCameraSnapshot, setPreviewCameraSnapshot] = useState<any>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Check auth on mount
  useEffect(() => {
    const authed = isAdminAuthenticated();
    setIsAuthenticated(authed);
    setAdminUser(getAdminUser());
  }, []);

  // Fetch admin dashboard data
  const fetchDashboardData = async () => {
    if (!isAdminAuthenticated()) return;
    setLoading(true);

    try {
      // 1. Overview
      const ovResp = await adminFetch(`${apiUrl}/api/v1/admin/overview`);
      if (ovResp.ok) {
        const ovData = await ovResp.json();
        setOverview(ovData);
      }

      // 2. Cameras
      const camResp = await adminFetch(`${apiUrl}/api/v1/cameras?limit=500`);
      if (camResp.ok) {
        const camData = await camResp.json();
        setCameras(camData);
      }

      // 3. Zones
      const zoneResp = await adminFetch(`${apiUrl}/api/v1/admin/zones`);
      if (zoneResp.ok) {
        const zoneData = await zoneResp.json();
        setZones(zoneData.items || []);
      }

      // 4. Alerts
      const alertResp = await adminFetch(`${apiUrl}/api/v1/admin/alerts`);
      if (alertResp.ok) {
        const alertData = await alertResp.json();
        setAlerts(alertData.items || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 15000); // 15s auto-refresh
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Queue actions
  const handleTriggerQueue = async () => {
    setActionLoading("trigger");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/queue/trigger`, { method: "POST" });
      if (resp.ok) {
        showToast("success", "Đã kích hoạt quét ngay lập tức!");
        await fetchDashboardData();
      } else {
        throw new Error("Không thể kích hoạt hàng đợi.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseQueue = async () => {
    setActionLoading("pause");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/queue/pause`, { method: "POST" });
      if (resp.ok) {
        showToast("success", "Đã tạm dừng hàng đợi quét tự động.");
        await fetchDashboardData();
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeQueue = async () => {
    setActionLoading("resume");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/queue/resume`, { method: "POST" });
      if (resp.ok) {
        showToast("success", "Đã tiếp tục hàng đợi quét tự động.");
        await fetchDashboardData();
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Camera actions
  const handleUpdateCameraStatus = async (cameraId: string, newStatus: string) => {
    setActionLoading(`cam-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (resp.ok) {
        showToast("success", `Đã đổi trạng thái camera ${cameraId} sang ${newStatus}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Không thể cập nhật trạng thái.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCamera = async (cameraId: string, cameraName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa camera "${cameraName}" (${cameraId})?`)) return;

    setActionLoading(`del-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Đã xóa camera ${cameraName} thành công.`);
        await fetchDashboardData();
      } else {
        throw new Error("Không thể xóa camera.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Zone override actions
  const handleCancelOverride = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Hủy ghi đè cho khu vực "${zoneName}" và trả về chế độ tự động AI?`)) return;

    setActionLoading(`override-${zoneId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/zones/${zoneId}/override`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Đã hủy ghi đè cho ${zoneName}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Lỗi khi hủy ghi đè.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Alert resolve action
  const handleResolveAlert = async (alertId: number) => {
    setActionLoading(`alert-${alertId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      if (resp.ok) {
        showToast("success", `Đã giải quyết cảnh báo #${alertId}.`);
        await fetchDashboardData();
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      cam.id.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      (cam.location && cam.location.toLowerCase().includes(cameraSearch.toLowerCase()));
    const matchesStatus =
      cameraStatusFilter === "all" || cam.status.toUpperCase() === cameraStatusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Head>
        <title>Trung Tâm Quản Trị Hệ Thống — FloodWheel</title>
      </Head>

      <Navbar />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold text-white ${
              notification.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          // ================= UNAUTHENTICATED STATE =================
          <div className="max-w-md mx-auto my-16 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Yêu Cầu Quyền Quản Trị</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Khu vực quản lý hàng đợi AI, camera giám sát và can thiệp ghi đè mức ngập khẩn cấp yêu cầu xác thực quản trị viên.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Đăng Nhập Quản Trị Viên</span>
            </button>
          </div>
        ) : (
          // ================= AUTHENTICATED ADMIN DASHBOARD =================
          <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Trung Tâm Quản Trị (Admin Portal)
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Quản lý hàng đợi AI Background Queue, danh mục Camera giao thông, và Ghi đè mức ngập khẩn cấp
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
                  Operator: <strong className="text-indigo-600 font-bold">{adminUser?.username || "admin"}</strong>
                </span>

                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-sm"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card 1: Cameras */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Tổng Camera</span>
                  <Camera className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {overview?.cameras?.total || cameras.length || 0}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-emerald-600 font-semibold">{overview?.cameras?.online || 0} Online</span>
                  <span>&bull;</span>
                  <span className="text-slate-400">{overview?.cameras?.offline || 0} Offline</span>
                </div>
              </div>

              {/* Card 2: AI Queue */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Hàng Đợi AI</span>
                  <Radio className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      overview?.queue?.status === "running"
                        ? "bg-emerald-500 animate-ping"
                        : overview?.queue?.status === "paused"
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                    }`}
                  />
                  <div className="text-xl font-black capitalize text-slate-900">
                    {overview?.queue?.status || "Idle"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 truncate">
                  {overview?.queue?.next_run_in_seconds
                    ? `Đợt tiếp theo: sau ${Math.round(overview.queue.next_run_in_seconds / 60)}p`
                    : "Sẵn sàng quét"}
                </div>
              </div>

              {/* Card 3: Zone Overrides */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Ghi Đè Thủ Công</span>
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {overview?.zones?.overridden || zones.filter((z) => z.is_overridden).length || 0}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  trên tổng số {overview?.zones?.total || zones.length || 0} khu vực
                </div>
              </div>

              {/* Card 4: Alerts */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Cảnh Báo Nguy Hiểm</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-rose-600">
                  {overview?.alerts?.active_count || alerts.filter((a) => a.is_active).length || 0}
                </div>
                <div className="mt-2 text-xs text-slate-500">cảnh báo đang kích hoạt</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("queue")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "queue"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Quản Trị Hàng Đợi AI</span>
              </button>

              <button
                onClick={() => setActiveTab("cameras")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "cameras"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Quản Lý Camera ({cameras.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("overrides")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "overrides"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Ghi Đè Vùng Ngập ({zones.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("alerts")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === "alerts"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Cảnh Báo Khẩn ({alerts.filter((a) => a.is_active).length})</span>
              </button>
            </div>

            {/* ================= TAB 1: AI QUEUE ================= */}
            {activeTab === "queue" && (
              <div className="space-y-6">
                {/* Control Panel */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Điều Khiển Hàng Đợi Tự Động (Queue Control)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quản lý chu kỳ quét Gemini Vision tự động và pacing interval chống nghẽn quota 429
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleTriggerQueue}
                        disabled={actionLoading === "trigger"}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Quét Ngay Lập Tức</span>
                      </button>

                      {overview?.queue?.status === "paused" ? (
                        <button
                          onClick={handleResumeQueue}
                          disabled={actionLoading === "resume"}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Tiếp Tục Chạy</span>
                        </button>
                      ) : (
                        <button
                          onClick={handlePauseQueue}
                          disabled={actionLoading === "pause"}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Tạm Dừng</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status telemetry box */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Trạng thái hiện tại:</span>
                      <strong className="text-slate-800 text-sm capitalize">{overview?.queue?.status || "Idle"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Khoảng cách chu kỳ:</span>
                      <strong className="text-slate-800 text-sm">
                        {overview?.queue?.interval_minutes || 30} phút / chu kỳ
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Camera đang phân tích:</span>
                      <strong className="text-indigo-600 text-sm truncate block">
                        {overview?.queue?.current_camera_name || "Chưa có"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Recent scan results */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Kết Quả Phân Tích Gần Nhất</h3>
                  {overview?.queue?.recent_results?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="pb-3">Camera</th>
                            <th className="pb-3">Mức Ngập</th>
                            <th className="pb-3">Độ Sâu (cm)</th>
                            <th className="pb-3">Trạng Thái</th>
                            <th className="pb-3">Thời Gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {overview.queue.recent_results.map((res: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-bold text-slate-800">{res.camera_name || res.camera_id}</td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    res.depth_level >= 3
                                      ? "bg-rose-100 text-rose-700"
                                      : res.depth_level >= 1
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  Level {res.depth_level}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {res.depth_cm_max ? `${res.depth_cm_min} - ${res.depth_cm_max} cm` : "0 cm"}
                              </td>
                              <td className="py-2.5">
                                {res.skipped ? (
                                  <span className="text-slate-400 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                                    Bỏ qua (ảnh default)
                                  </span>
                                ) : res.cached ? (
                                  <span className="text-blue-600 text-[10px] bg-blue-50 px-2 py-0.5 rounded-full">
                                    Cache-Hit
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                                    Quét Mới (AI)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-slate-400">
                                {res.timestamp ? new Date(res.timestamp).toLocaleTimeString("vi-VN") : "Vừa xong"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">Chưa có kết quả quét nào được ghi nhận.</div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 2: CAMERAS ================= */}
            {activeTab === "cameras" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  {/* Search and filters */}
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

                  {/* Actions & View switchers */}
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
                      onClick={() => setCacheBuster(Date.now())}
                      title="Làm mới toàn bộ ảnh chụp camera"
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Làm mới ảnh</span>
                    </button>

                    <button
                      onClick={() => setIsAddCameraOpen(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 shrink-0"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Thêm Camera</span>
                    </button>
                  </div>
                </div>

                {/* Camera List / Grid */}
                {filteredCameras.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Không tìm thấy camera nào phù hợp với bộ lọc.
                  </div>
                ) : cameraViewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
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
                          <tr key={cam.id} className="hover:bg-slate-50/50">
                            {/* Snapshot Thumbnail Column */}
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
                              {cam.latest_reading ? (
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
                                  onClick={() => setPreviewCameraSnapshot(cam)}
                                  title="Xem ảnh chi tiết"
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {/* Status toggles */}
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

                                <button
                                  onClick={() => handleDeleteCamera(cam.id, cam.name)}
                                  title="Xóa camera"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCameras.map((cam) => (
                      <div
                        key={cam.id}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                      >
                        {/* Snapshot viewport */}
                        <div
                          onClick={() => setPreviewCameraSnapshot(cam)}
                          className="relative aspect-video bg-slate-950 overflow-hidden group cursor-pointer"
                          title="Nhấn để phóng to ảnh chụp"
                        >
                          <img
                            src={`${apiUrl}/api/v1/cameras/${cam.id}/snapshot?t=${cacheBuster}`}
                            alt={cam.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180' fill='%231e293b'><rect width='320' height='180' fill='%230f172a'/><text x='50%' y='50%' fill='%2364748b' font-size='13' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>Mất tín hiệu camera</text></svg>";
                            }}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Status Badge overlay */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs backdrop-blur-xs ${
                                cam.status === "ONLINE"
                                  ? "bg-emerald-500/90 text-white"
                                  : cam.status === "MAINTENANCE"
                                  ? "bg-amber-500/90 text-white"
                                  : "bg-slate-700/90 text-slate-200"
                              }`}
                            >
                              {cam.status}
                            </span>
                            {cam.latest_reading && (
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs ${
                                  cam.latest_reading.depth_level >= 3
                                    ? "bg-rose-500/90 text-white"
                                    : cam.latest_reading.depth_level >= 1
                                    ? "bg-amber-500/90 text-white"
                                    : "bg-emerald-600/90 text-white"
                                }`}
                              >
                                Level {cam.latest_reading.depth_level}
                              </span>
                            )}
                          </div>

                          {/* Hover zoom icon */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                            <Maximize2 className="w-5 h-5 drop-shadow" />
                            <span className="text-xs font-bold drop-shadow">Phóng to ảnh</span>
                          </div>

                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white/90">
                            Snapshot gần nhất
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1" title={cam.name}>
                                  {cam.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{cam.id}</p>
                              </div>
                              <button
                                onClick={() => setPreviewCameraSnapshot(cam)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shrink-0"
                                title="Xem ảnh chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 line-clamp-1">
                              📍 {cam.location || "TP. Hồ Chí Minh"}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {cam.status !== "ONLINE" && (
                                <button
                                  onClick={() => handleUpdateCameraStatus(cam.id, "ONLINE")}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                                >
                                  Online
                                </button>
                              )}
                              {cam.status !== "OFFLINE" && (
                                <button
                                  onClick={() => handleUpdateCameraStatus(cam.id, "OFFLINE")}
                                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold"
                                >
                                  Offline
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
                            </div>

                            <button
                              onClick={() => handleDeleteCamera(cam.id, cam.name)}
                              title="Xóa camera"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: OVERRIDES ================= */}
            {activeTab === "overrides" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-900">Ghi Đè Thủ Công Mức Ngập Vùng (Zone Overrides)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Can thiệp khẩn cấp mức ngập khi nhận được thông tin kiểm tra hiện trường, tạm thời đè lên suy luận AI
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3">Khu Vực (Zone)</th>
                        <th className="pb-3">Quận</th>
                        <th className="pb-3">Mức Ngập Hiện Tại</th>
                        <th className="pb-3">Chế Độ</th>
                        <th className="pb-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {zones.map((z) => (
                        <tr key={z.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-900">{z.name}</td>
                          <td className="py-3 text-slate-600">{z.district}</td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                z.current_depth_level >= 3
                                  ? "bg-rose-100 text-rose-700"
                                  : z.current_depth_level >= 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              Level {z.current_depth_level} ({z.current_depth_cm_min}-{z.current_depth_cm_max}cm)
                            </span>
                          </td>
                          <td className="py-3">
                            {z.is_overridden ? (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Ghi Đè Thủ Công ⚠
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                Tự Động AI
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedZoneForOverride(z)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
                              >
                                Đặt Mức Ghi Đè
                              </button>

                              {z.is_overridden && (
                                <button
                                  onClick={() => handleCancelOverride(z.id, z.name)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold transition"
                                >
                                  Hủy Ghi Đè
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================= TAB 4: ALERTS ================= */}
            {activeTab === "alerts" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-900">Danh Sách Cảnh Báo Nguy Hiểm</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các cảnh báo ngập từ Level 3 trở lên kích hoạt phát sóng Webhook và hiển thị trên bản đồ
                  </p>
                </div>

                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((al) => (
                      <div
                        key={al.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                          al.is_active
                            ? "bg-rose-50/70 border-rose-200 text-rose-900"
                            : "bg-slate-50 border-slate-200 text-slate-600 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            className={`w-5 h-5 shrink-0 mt-0.5 ${al.is_active ? "text-rose-600" : "text-slate-400"}`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">Zone: {al.zone_id}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                Cấp {al.level}
                              </span>
                              {!al.is_active && (
                                <span className="text-[10px] text-slate-500 font-semibold">Đã Giải Quyết</span>
                              )}
                            </div>
                            <p className="text-xs mt-1 leading-relaxed">{al.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {al.created_at ? new Date(al.created_at).toLocaleString("vi-VN") : ""}
                            </span>
                          </div>
                        </div>

                        {al.is_active && (
                          <button
                            onClick={() => handleResolveAlert(al.id)}
                            className="px-3 py-1.5 rounded-xl bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 text-xs font-bold shrink-0 transition"
                          >
                            Đánh Dấu Đã Xử Lý
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Hiện không có cảnh báo ngập nguy hiểm nào.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Camera Modal */}
      <AddCameraModal
        isOpen={isAddCameraOpen}
        onClose={() => setIsAddCameraOpen(false)}
        onSuccess={() => {
          showToast("success", "Đã thêm camera mới thành công!");
          fetchDashboardData();
        }}
      />

      {/* Zone Override Dialog */}
      {selectedZoneForOverride && (
        <OverrideDialog
          isOpen={true}
          onClose={() => setSelectedZoneForOverride(null)}
          zoneId={selectedZoneForOverride.id}
          zoneName={selectedZoneForOverride.name}
          currentLevel={selectedZoneForOverride.current_depth_level}
          onSuccess={() => {
            showToast("success", `Đã cập nhật ghi đè cho ${selectedZoneForOverride.name}`);
            fetchDashboardData();
          }}
        />
      )}

      {/* Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsAuthenticated(true);
          setAdminUser(getAdminUser());
        }}
      />

      {/* Camera Snapshot Preview Modal */}
      {previewCameraSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewCameraSnapshot(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {previewCameraSnapshot.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    ID: {previewCameraSnapshot.id} • {previewCameraSnapshot.location || "TP. Hồ Chí Minh"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCacheBuster(Date.now())}
                  title="Làm mới ảnh chụp"
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>

                <a
                  href={`${apiUrl}/api/v1/cameras/${previewCameraSnapshot.id}/snapshot?t=${cacheBuster}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở ảnh gốc trong tab mới"
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Ảnh gốc</span>
                </a>

                <button
                  onClick={() => setPreviewCameraSnapshot(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Snapshot Image Area */}
            <div className="relative bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[62vh] overflow-hidden p-3">
              <img
                src={`${apiUrl}/api/v1/cameras/${previewCameraSnapshot.id}/snapshot?t=${cacheBuster}`}
                alt={previewCameraSnapshot.name}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360' fill='%231e293b'><rect width='640' height='360' fill='%230f172a'/><text x='50%' y='50%' fill='%2394a3b8' font-size='18' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>Không tìm thấy ảnh chụp lưu trữ của camera này</text></svg>";
                }}
              />
              <div className="absolute bottom-5 left-5 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">Ảnh chụp lưu trữ gần nhất</span>
                <span className="text-white/40">•</span>
                <span className="text-white/70 font-mono text-[11px]">/api/v1/cameras/{previewCameraSnapshot.id}/snapshot</span>
              </div>
            </div>

            {/* Footer / Telemetry */}
            <div className="px-6 py-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-full font-bold ${
                    previewCameraSnapshot.status === "ONLINE"
                      ? "bg-emerald-100 text-emerald-700"
                      : previewCameraSnapshot.status === "MAINTENANCE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {previewCameraSnapshot.status}
                </span>
                {previewCameraSnapshot.latest_reading ? (
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold ${
                      previewCameraSnapshot.latest_reading.depth_level >= 3
                        ? "bg-rose-100 text-rose-700"
                        : previewCameraSnapshot.latest_reading.depth_level >= 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    Mức ngập: Level {previewCameraSnapshot.latest_reading.depth_level} (
                    {previewCameraSnapshot.latest_reading.water_depth_cm ?? 0} cm)
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa có kết quả phân tích mức ngập</span>
                )}
              </div>

              <div className="text-slate-400 text-[11px]">
                Tọa độ: {previewCameraSnapshot.latitude}, {previewCameraSnapshot.longitude}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
