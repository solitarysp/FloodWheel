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
  Sparkles,
  Flame,
  RotateCcw,
  FileText,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info,
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
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configIntervalMinutes, setConfigIntervalMinutes] = useState<number>(30);
  const [configMaxCameras, setConfigMaxCameras] = useState<number>(15);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Filters & search
  const [cameraSearch, setCameraSearch] = useState<string>("");
  const [cameraStatusFilter, setCameraStatusFilter] = useState<string>("all");
  const [cameraViewMode, setCameraViewMode] = useState<"table" | "grid">("table");
  const [previewCameraSnapshot, setPreviewCameraSnapshot] = useState<any>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [analyzingCameraId, setAnalyzingCameraId] = useState<string | null>(null);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  // AI Queue DB History State
  const [queueHistory, setQueueHistory] = useState<any[]>([]);
  const [queueHistoryTotal, setQueueHistoryTotal] = useState<number>(0);
  const [queueHistoryPage, setQueueHistoryPage] = useState<number>(1);
  const [queueHistoryPageSize] = useState<number>(12);
  const [queueHistoryTotalPages, setQueueHistoryTotalPages] = useState<number>(1);
  const [queueHistoryStats, setQueueHistoryStats] = useState<any>({
    total_calls: 0,
    completed_count: 0,
    flooded_count: 0,
    failed_count: 0,
    skipped_count: 0,
    avg_inference_ms: 0,
  });
  const [queueHistoryStatusFilter, setQueueHistoryStatusFilter] = useState<string>("ALL");
  const [queueHistoryTypeFilter, setQueueHistoryTypeFilter] = useState<string>("all");
  const [queueHistorySearch, setQueueHistorySearch] = useState<string>("");
  const [queueHistoryLoading, setQueueHistoryLoading] = useState<boolean>(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any | null>(null);
  const [isDetailModalLoading, setIsDetailModalLoading] = useState<boolean>(false);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

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
        if (ovData?.queue?.next_run_in_seconds !== undefined) {
          setCountdownSeconds(ovData.queue.next_run_in_seconds);
        }
        if (ovData?.queue?.interval_minutes) {
          setConfigIntervalMinutes(ovData.queue.interval_minutes);
        }
        if (ovData?.queue?.max_cameras_per_cycle) {
          setConfigMaxCameras(ovData.queue.max_cameras_per_cycle);
        }
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

  // 1-second countdown clock ticker
  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  // Adaptive polling: 3s during active scan, 15s when idle
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      const isRunning = overview?.queue?.status === "running";
      const pollMs = isRunning ? 3000 : 15000;
      const interval = setInterval(fetchDashboardData, pollMs);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, overview?.queue?.status]);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveQueueConfig = async () => {
    setActionLoading("config");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/queue/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval_minutes: Number(configIntervalMinutes),
          max_cameras_per_cycle: Number(configMaxCameras),
        }),
      });
      if (resp.ok) {
        showToast("success", "Đã cập nhật cấu hình chu kỳ quét thành công!");
        setIsConfigModalOpen(false);
        await fetchDashboardData();
      } else {
        throw new Error("Không thể cập nhật cấu hình hàng đợi.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Queue actions
  const handleTriggerQueue = async () => {
    setActionLoading("trigger");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/queue/trigger`, { method: "POST" });
      if (resp.ok) {
        showToast("success", "Đã kích hoạt quét ngay lập tức!");
        await fetchDashboardData();
        await fetchQueueHistory(1);
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
        await fetchQueueHistory(1);
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch paginated AI Queue History from DB
  const fetchQueueHistory = async (page = queueHistoryPage) => {
    if (!isAdminAuthenticated()) return;
    setQueueHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(queueHistoryPageSize),
      });
      if (queueHistoryStatusFilter && queueHistoryStatusFilter !== "ALL") {
        params.append("status", queueHistoryStatusFilter);
      }
      if (queueHistoryTypeFilter && queueHistoryTypeFilter !== "all") {
        params.append("task_type", queueHistoryTypeFilter);
      }
      if (queueHistorySearch.trim()) {
        params.append("search", queueHistorySearch.trim());
      }

      const res = await adminFetch(`${apiUrl}/api/v1/admin/queue/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQueueHistory(data.items || []);
        setQueueHistoryTotal(data.total || 0);
        setQueueHistoryPage(data.page || 1);
        setQueueHistoryTotalPages(data.total_pages || 1);
        if (data.stats) {
          setQueueHistoryStats(data.stats);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch queue history:", err);
    } finally {
      setQueueHistoryLoading(false);
    }
  };

  const handleViewTaskDetail = async (taskId: string) => {
    setIsDetailModalLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/v1/admin/queue/history/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTaskDetail(data.task);
      } else {
        showToast("error", "Không thể tải chi tiết tác vụ.");
      }
    } catch (err: any) {
      showToast("error", `Lỗi tải chi tiết: ${err.message}`);
    } finally {
      setIsDetailModalLoading(false);
    }
  };

  const handleClearQueueHistory = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử hàng đợi AI trong database?")) return;
    setActionLoading("clear-history");
    try {
      const res = await adminFetch(`${apiUrl}/api/v1/admin/queue/history`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Đã xóa toàn bộ lịch sử hàng đợi AI trong database.");
        await fetchQueueHistory(1);
        await fetchDashboardData();
      } else {
        showToast("error", "Không thể xóa lịch sử hàng đợi.");
      }
    } catch (err: any) {
      showToast("error", `Lỗi xóa lịch sử: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Refetch queue history on tab change or filter changes
  useEffect(() => {
    if (isAuthenticated && activeTab === "queue") {
      fetchQueueHistory(1);
    }
  }, [isAuthenticated, activeTab, queueHistoryStatusFilter, queueHistoryTypeFilter]);

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

  const handleDeleteCameraReading = async (cameraId: string, cameraName?: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa kết quả phân tích AI của camera "${cameraName || cameraId}"?`)) return;

    setActionLoading(`del-reading-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}/readings`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Đã xóa kết quả phân tích AI của camera ${cameraName || cameraId}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Không thể xóa kết quả phân tích.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAllReadings = async () => {
    if (
      !confirm(
        "CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ kết quả phân tích AI và đặt lại các khu vực về trạng thái bình thường (Level 0)?"
      )
    )
      return;

    setActionLoading("clear-readings");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/readings`, {
        method: "DELETE",
      });
      if (resp.ok) {
        const data = await resp.json();
        showToast("success", data.message || "Đã xóa toàn bộ kết quả phân tích AI thành công!");
        await fetchDashboardData();
      } else {
        throw new Error("Không thể xóa toàn bộ kết quả phân tích.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Camera selection handlers
  const toggleSelectCamera = (cameraId: string) => {
    setSelectedCameraIds((prev) =>
      prev.includes(cameraId) ? prev.filter((id) => id !== cameraId) : [...prev, cameraId]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredCameras.map((c) => c.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedCameraIds.includes(id));
    if (allSelected) {
      setSelectedCameraIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedCameraIds, ...filteredIds]));
      setSelectedCameraIds(combined);
    }
  };

  const handleSelectNone = () => {
    setSelectedCameraIds([]);
  };

  // On-demand AI Analysis actions
  const handleAnalyzeCamera = async (cameraId: string, forceRefresh: boolean = true) => {
    setAnalyzingCameraId(cameraId);
    try {
      const resp = await adminFetch(
        `${apiUrl}/api/v1/admin/cameras/${cameraId}/analyze?force_refresh=${forceRefresh}`,
        { method: "POST" }
      );
      const data = await resp.json();
      if (resp.ok) {
        if (data.skipped) {
          showToast("success", `Camera ${cameraId}: Đang chờ ảnh từ cam (ảnh mock, bỏ qua AI)`);
        } else {
          showToast(
            "success",
            `Phân tích hoàn tất ${cameraId}: Mức ${data.depth_level ?? 0} (${data.depth_cm_max || 0} cm)`
          );
        }
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Lỗi khi phân tích camera.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setAnalyzingCameraId(null);
    }
  };

  const handleBatchAnalyze = async (targetCameraIds?: string[]) => {
    const idsToAnalyze = targetCameraIds || selectedCameraIds;
    if (idsToAnalyze.length === 0) {
      showToast("error", "Vui lòng chọn ít nhất 1 camera để phân tích AI.");
      return;
    }

    setIsBatchAnalyzing(true);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/analyze-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_ids: idsToAnalyze,
          force_refresh: true,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        showToast(
          "success",
          `Hoàn tất quét ${idsToAnalyze.length} camera: ${data.analyzed_count} thành công, ${data.skipped_count} chờ ảnh thật, ${data.error_count} lỗi.`
        );
        setSelectedCameraIds([]);
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Lỗi khi phân tích hàng loạt.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsBatchAnalyzing(false);
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
                  onClick={handleClearAllReadings}
                  disabled={actionLoading === "clear-readings"}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  title="Xóa toàn bộ kết quả phân tích AI và đặt lại các khu vực về Level 0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{actionLoading === "clear-readings" ? "Đang xóa..." : "Xóa All Kết Quả"}</span>
                </button>

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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Radio className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          Điều Khiển & Giám Sát Hàng Đợi AI (AI Queue Monitor)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Tự động quét camera mỗi 30 phút, luân phiên phân tích ngập bằng Gemini Vision và chống nghẽn quota
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleTriggerQueue}
                        disabled={actionLoading === "trigger" || overview?.queue?.status === "running"}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                      >
                        {actionLoading === "trigger" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        <span>Quét Ngay Lập Tức</span>
                      </button>

                      {overview?.queue?.status === "paused" ? (
                        <button
                          onClick={handleResumeQueue}
                          disabled={actionLoading === "resume"}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Tiếp Tục Chạy</span>
                        </button>
                      ) : (
                        <button
                          onClick={handlePauseQueue}
                          disabled={actionLoading === "pause" || overview?.queue?.status === "running"}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Tạm Dừng</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
                        title="Cấu hình chu kỳ và số lượng camera"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-500" />
                        <span className="hidden sm:inline">Cấu Hình</span>
                      </button>

                      <button
                        onClick={handleClearAllReadings}
                        disabled={actionLoading === "clear-readings"}
                        className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
                        title="Xóa toàn bộ kết quả quét AI trong database và làm mới các khu vực"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span className="hidden sm:inline">{actionLoading === "clear-readings" ? "Đang xóa..." : "Xóa All Kết Quả"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* HERO SCANNING TELEMETRY & STATUS MONITOR */}
                {overview?.queue?.status === "running" ? (
                  <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-lg shadow-indigo-950/20 border border-indigo-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                          <Radio className="w-5 h-5 text-indigo-300 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                              Đang Tiến Hành Quét Tự Động
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 font-bold">
                              Đợt #{overview.queue.current_cycle_id || 1}
                            </span>
                          </div>
                          <h4 className="text-lg font-black tracking-tight text-white mt-0.5">
                            Hệ thống đang phân tích ảnh camera AI Gemini Vision
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-indigo-300 block">Tiến độ đợt quét</span>
                        <span className="text-2xl font-black text-white">
                          {overview.queue.cycle_progress?.processed || 0} / {overview.queue.cycle_progress?.total || 0}
                          <span className="text-sm font-semibold text-indigo-300 ml-1.5">
                            ({overview.queue.cycle_progress?.total > 0
                              ? Math.round(
                                  (overview.queue.cycle_progress.processed /
                                    overview.queue.cycle_progress.total) *
                                    100
                                )
                              : 0}%)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-indigo-950/60 rounded-full h-3 mb-6 p-0.5 border border-indigo-700/40 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 h-2 rounded-full transition-all duration-500 shadow-sm"
                        style={{
                          width: `${
                            overview.queue.cycle_progress?.total > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (overview.queue.cycle_progress.processed /
                                      overview.queue.cycle_progress.total) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    {/* Grid: Camera Under Inspection & Live Counters */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: Active Camera Spotlight */}
                      <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                        {overview.queue.current_camera_id ? (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/20 shrink-0">
                            <img
                              src={`${apiUrl}/api/v1/cameras/${overview.queue.current_camera_id}/snapshot?t=${cacheBuster}`}
                              alt="Camera snapshot"
                              className="w-full h-full object-cover"
                              onError={(e: any) => {
                                e.target.style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-[10px] pointer-events-none">
                              <Camera className="w-6 h-6 text-white/30" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Camera className="w-8 h-8 text-white/40" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-300 block tracking-wider">
                            Camera đang quét
                          </span>
                          <h5 className="text-sm font-black text-white truncate mt-0.5">
                            {overview.queue.current_camera_name || overview.queue.current_camera_id || "Đang phân tích..."}
                          </h5>
                          <span className="text-xs text-indigo-200 block truncate">
                            ID: {overview.queue.current_camera_id || "N/A"}
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] font-semibold text-emerald-300">Đang chạy AI VLRDR...</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Category Count Chips */}
                      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                          <span className="text-[10px] uppercase font-semibold text-indigo-200 block">Đã Quét</span>
                          <span className="text-xl font-black text-white">
                            {overview.queue.cycle_progress?.processed || 0}
                          </span>
                          <span className="text-[10px] text-indigo-300 block">/ {overview.queue.cycle_progress?.total || 0}</span>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                          <span className="text-[10px] uppercase font-semibold text-rose-300 block">Có Ngập</span>
                          <span className="text-xl font-black text-rose-400">
                            {overview.queue.cycle_progress?.flooded || 0}
                          </span>
                          <span className="text-[10px] text-rose-300/80 block">điểm ngập</span>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                          <span className="text-[10px] uppercase font-semibold text-emerald-300 block">An Toàn</span>
                          <span className="text-xl font-black text-emerald-400">
                            {Math.max(
                              0,
                              (overview.queue.cycle_progress?.success || 0) -
                                (overview.queue.cycle_progress?.flooded || 0)
                            )}
                          </span>
                          <span className="text-[10px] text-emerald-300/80 block">không ngập</span>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                          <span className="text-[10px] uppercase font-semibold text-slate-300 block">Bỏ Qua / Lỗi</span>
                          <span className="text-xl font-black text-amber-300">
                            {(overview.queue.cycle_progress?.skipped || 0) +
                              (overview.queue.cycle_progress?.failed || 0)}
                          </span>
                          <span className="text-[10px] text-slate-300/80 block">
                            {overview.queue.cycle_progress?.skipped || 0} skip • {overview.queue.cycle_progress?.failed || 0} lỗi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : overview?.queue?.status === "paused" ? (
                  <div className="rounded-3xl p-6 bg-amber-500/10 border border-amber-300/60 text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Pause className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-amber-950">Hàng Đợi AI Đang Tạm Dừng</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Chu kỳ quét tự động mỗi {overview?.queue?.interval_minutes || 30} phút đang tạm ngừng. Nhấn Tiếp Tục để kích hoạt lại.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResumeQueue}
                      disabled={actionLoading === "resume"}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Tiếp Tục Chạy Hàng Đợi</span>
                    </button>
                  </div>
                ) : overview?.queue?.status === "error" ? (
                  <div className="rounded-3xl p-6 bg-rose-50 border border-rose-200 text-rose-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-rose-950">Hàng Đợi Gặp Sự Cố</h4>
                        <p className="text-xs text-rose-700 mt-0.5">
                          Hệ thống đã tự phục hồi về trạng thái an toàn. Bạn có thể kích hoạt lại chu kỳ quét bất kỳ lúc nào.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTriggerQueue}
                      disabled={actionLoading === "trigger"}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Khởi Động Lại Ngay</span>
                    </button>
                  </div>
                ) : (
                  /* IDLE STATE: PROMINENT COUNTDOWN CLOCK & LAST RUN METRICS */
                  <div className="rounded-3xl p-6 bg-white border border-slate-200/80 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Left: Countdown Clock */}
                      <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
                            Đợt Quét Tiếp Theo (Countdown)
                          </span>
                          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                            {String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:
                            {String(countdownSeconds % 60).padStart(2, "0")}
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            Dự kiến lúc:{" "}
                            <strong className="text-slate-800">
                              {overview?.queue?.next_run_at
                                ? new Date(overview.queue.next_run_at).toLocaleTimeString("vi-VN")
                                : "Sẵn sàng quét"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Last Completed Cycle Telemetry */}
                      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Thời Lượng Chạy</span>
                          <div className="text-lg font-black text-slate-800 mt-0.5">
                            {overview?.queue?.last_cycle_summary?.duration_seconds !== undefined
                              ? `${overview.queue.last_cycle_summary.duration_seconds}s`
                              : "N/A"}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Đợt #{overview?.queue?.last_cycle_summary?.cycle_id || overview?.queue?.current_cycle_id || 0}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Số Camera Quét</span>
                          <div className="text-lg font-black text-slate-800 mt-0.5">
                            {overview?.queue?.last_cycle_summary?.total_cameras || 0}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {overview?.queue?.last_cycle_summary?.successful || 0} thành công
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                          <span className="text-[10px] uppercase font-semibold text-rose-500 block">Phát Hiện Ngập</span>
                          <div className="text-lg font-black text-rose-600 mt-0.5">
                            {overview?.queue?.last_cycle_summary?.flooded_count || 0}
                          </div>
                          <span className="text-[10px] text-rose-400 block">vùng ngập</span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                          <span className="text-[10px] uppercase font-semibold text-blue-500 block">Mức Ngập Cao Nhất</span>
                          <div className="text-lg font-black text-blue-600 mt-0.5">
                            {overview?.queue?.last_cycle_summary?.max_depth_cm || 0} cm
                          </div>
                          <span className="text-[10px] text-blue-400 block">ước tính AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= AI QUEUE DATABASE HISTORY AUDIT TABLE ================= */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                  {/* Header & Main Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Lịch Sử Chi Tiết Các Lệnh Gọi AI Trong Database (AI Queue Audit History)
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Tất cả lệnh gọi AI từ chu kỳ tự động, quét trực tiếp camera, và tải ảnh demo đều được đưa vào hàng đợi và lưu trữ chi tiết vào PostgreSQL.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <button
                        onClick={() => fetchQueueHistory(queueHistoryPage)}
                        disabled={queueHistoryLoading}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        title="Tải lại lịch sử hàng đợi từ database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${queueHistoryLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
                        <span>Làm Mới</span>
                      </button>

                      <button
                        onClick={handleClearQueueHistory}
                        disabled={actionLoading === "clear-history"}
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        title="Xóa toàn bộ lịch sử hàng đợi AI trong database"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>{actionLoading === "clear-history" ? "Đang xóa..." : "Xóa Lịch Sử DB"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tổng Lệnh Gọi</span>
                      <span className="text-lg font-black text-slate-900">{queueHistoryStats.total_calls || 0}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Hoàn Thành</span>
                      <span className="text-lg font-black text-emerald-700">{queueHistoryStats.completed_count || 0}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">Phát Hiện Ngập</span>
                      <span className="text-lg font-black text-rose-700">{queueHistoryStats.flooded_count || 0}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Bỏ Qua / Cache</span>
                      <span className="text-lg font-black text-slate-700">{queueHistoryStats.skipped_count || 0}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Thất Bại / Lỗi</span>
                      <span className="text-lg font-black text-amber-700">{queueHistoryStats.failed_count || 0}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">Độ Trễ TB</span>
                      <span className="text-lg font-black text-indigo-700">{queueHistoryStats.avg_inference_ms || 0} ms</span>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                      {[
                        { key: "ALL", label: "Tất Cả" },
                        { key: "COMPLETED", label: "Hoàn Thành" },
                        { key: "FLOODED", label: "Có Ngập" },
                        { key: "SKIPPED", label: "Bỏ Qua" },
                        { key: "FAILED", label: "Thất Bại" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setQueueHistoryStatusFilter(tab.key);
                            setQueueHistoryPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            queueHistoryStatusFilter === tab.key
                              ? "bg-white text-indigo-600 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Right: Search & Type Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={queueHistoryTypeFilter}
                        onChange={(e) => {
                          setQueueHistoryTypeFilter(e.target.value);
                          setQueueHistoryPage(1);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Tất cả nguồn gọi</option>
                        <option value="cycle_camera">Chu kỳ tự động 30m</option>
                        <option value="single_camera">Quét trực tiếp camera</option>
                        <option value="image_upload">Tải ảnh demo</option>
                        <option value="batch_camera">Quét hàng loạt</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm camera, ID..."
                          value={queueHistorySearch}
                          onChange={(e) => setQueueHistorySearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") fetchQueueHistory(1);
                          }}
                          className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3.5">Mã & Thời Gian</th>
                          <th className="py-3 px-3.5">Nguồn / Loại</th>
                          <th className="py-3 px-3.5">Camera / Đối Tượng</th>
                          <th className="py-3 px-3.5">Mực Nước (AI)</th>
                          <th className="py-3 px-3.5">Model & Độ Trễ</th>
                          <th className="py-3 px-3.5">Hàng Đợi</th>
                          <th className="py-3 px-3.5">Trạng Thái</th>
                          <th className="py-3 px-3.5 text-right">Chi Tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {queueHistoryLoading ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                              <span>Đang tải lịch sử hàng đợi AI từ database...</span>
                            </td>
                          </tr>
                        ) : queueHistory.length > 0 ? (
                          queueHistory.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              {/* Task ID & Time */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                                  #{item.id.replace("task_", "")}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {item.created_at ? new Date(item.created_at).toLocaleTimeString("vi-VN") : "N/A"}{" "}
                                  <span className="text-[10px] text-slate-300">
                                    {item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Source / Type */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.task_type === "cycle_camera"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : item.task_type === "image_upload"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : item.task_type === "single_camera"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {item.task_type === "cycle_camera"
                                    ? `Chu kỳ #${item.cycle_id || 1}`
                                    : item.task_type === "image_upload"
                                    ? "Demo Upload"
                                    : item.task_type === "single_camera"
                                    ? "Quét Camera"
                                    : "Batch Scan"}
                                </span>
                              </td>

                              {/* Camera / Target */}
                              <td className="py-3 px-3.5">
                                <div className="font-bold text-slate-800 truncate max-w-[160px]" title={item.camera_name || item.camera_id}>
                                  {item.camera_name || item.camera_id || "Khung hình"}
                                </div>
                                {item.camera_id && (
                                  <div className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                                    ID: {item.camera_id}
                                  </div>
                                )}
                              </td>

                              {/* Flood Level & Depth */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                {item.status === "FAILED" ? (
                                  <span className="text-rose-600 font-bold text-[11px]">Lỗi phân tích</span>
                                ) : item.status === "SKIPPED" ? (
                                  <span className="text-slate-400 font-semibold text-[11px]">Bỏ qua (ảnh default)</span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
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

                              {/* Model & Latency */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="text-slate-700 font-semibold text-[11px] truncate max-w-[120px]" title={item.model_used || "N/A"}>
                                  {item.model_used === "cache-hit" ? (
                                    <span className="text-blue-600 font-bold">Cache-Hit</span>
                                  ) : (
                                    item.model_used || "Gemini AI"
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.inference_time_ms ? `${item.inference_time_ms}ms` : "-"}
                                  {item.tokens_used ? ` • ${item.tokens_used} tok` : ""}
                                </div>
                              </td>

                              {/* Queue Wait */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="text-slate-700 font-mono text-[11px]">
                                  {item.queue_wait_ms !== null && item.queue_wait_ms !== undefined ? `${item.queue_wait_ms}ms` : "-"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.duration_ms !== null && item.duration_ms !== undefined ? `Tổng ${item.duration_ms}ms` : ""}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
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

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleViewTaskDetail(item.id)}
                                  disabled={isDetailModalLoading}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                                  title="Xem toàn bộ prompt, raw response, lập luận AI và thông số"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Chi Tiết</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              Chưa có lệnh gọi AI nào được ghi nhận trong cơ sở dữ liệu.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

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
                          onClick={() => {
                            if (queueHistoryPage > 1) {
                              const p = queueHistoryPage - 1;
                              setQueueHistoryPage(p);
                              fetchQueueHistory(p);
                            }
                          }}
                          disabled={queueHistoryPage <= 1 || queueHistoryLoading}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition"
                          title="Trang trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 font-bold text-slate-800 bg-slate-100 rounded-xl">
                          {queueHistoryPage} / {queueHistoryTotalPages}
                        </span>

                        <button
                          onClick={() => {
                            if (queueHistoryPage < queueHistoryTotalPages) {
                              const p = queueHistoryPage + 1;
                              setQueueHistoryPage(p);
                              fetchQueueHistory(p);
                            }
                          }}
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

                    {/* HOT AI Analysis Button */}
                    <button
                      onClick={() => handleBatchAnalyze()}
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

                    {/* Scan All Filtered Cameras Button */}
                    <button
                      onClick={() => handleBatchAnalyze(filteredCameras.map((c) => c.id))}
                      disabled={isBatchAnalyzing || filteredCameras.length === 0}
                      title={`Quét AI toàn bộ ${filteredCameras.length} camera đang hiển thị`}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                      <span className="hidden xl:inline">Quét Tất Cả ({filteredCameras.length})</span>
                    </button>

                    <button
                      onClick={() => setCacheBuster(Date.now())}
                      title="Làm mới toàn bộ ảnh chụp camera"
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Làm mới ảnh</span>
                    </button>

                    <button
                      onClick={handleClearAllReadings}
                      disabled={actionLoading === "clear-readings"}
                      title="Xóa toàn bộ kết quả phân tích AI và đặt lại các khu vực về Level 0"
                      className="p-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden sm:inline">{actionLoading === "clear-readings" ? "Đang xóa..." : "Xóa All Kết Quả"}</span>
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

                {/* Active Selection Banner */}
                {selectedCameraIds.length > 0 && (
                  <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span>
                        Đang chọn <strong className="text-orange-600 font-bold">{selectedCameraIds.length}</strong> camera để thao tác phân tích AI
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBatchAnalyze()}
                        disabled={isBatchAnalyzing}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold shadow-xs transition flex items-center gap-1.5"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isBatchAnalyzing ? "animate-spin" : ""}`} />
                        <span>{isBatchAnalyzing ? "Đang xử lý..." : `🔥 Bắt Đầu Phân Tích (${selectedCameraIds.length})`}</span>
                      </button>
                      <button
                        onClick={handleSelectNone}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition font-medium text-[11px]"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                )}

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
                            {/* Checkbox Column */}
                            <td className="py-3 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedCameraIds.includes(cam.id)}
                                onChange={() => toggleSelectCamera(cam.id)}
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                              />
                            </td>
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
                                {/* Single Camera AI Scan */}
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
                                    className={`w-3 h-3 ${
                                      analyzingCameraId === cam.id ? "animate-spin" : ""
                                    }`}
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

                                {cam.latest_reading && (
                                  <button
                                    onClick={() => handleDeleteCameraReading(cam.id, cam.name)}
                                    disabled={actionLoading === `del-reading-${cam.id}`}
                                    title="Xóa kết quả phân tích AI của camera này"
                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
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
                        className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                          selectedCameraIds.includes(cam.id)
                            ? "border-orange-400 ring-2 ring-orange-300 shadow-md"
                            : "border-slate-200/80 shadow-xs hover:shadow-md"
                        }`}
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

                          {/* Selection Checkbox */}
                          <div
                            className="absolute top-2.5 right-2.5 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCameraIds.includes(cam.id)}
                              onChange={() => toggleSelectCamera(cam.id)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-white/80 cursor-pointer shadow-md bg-white/95"
                              title="Chọn camera để quét hàng loạt"
                            />
                          </div>

                          {/* Status Badge overlay */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
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
                            {cam.latest_reading?.alert_message === "Đang chờ ảnh từ cam" ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] shadow-xs backdrop-blur-xs bg-slate-900/90 text-slate-200 border border-white/20 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-slate-300" />
                                <span>Đang chờ ảnh từ cam</span>
                              </span>
                            ) : cam.latest_reading ? (
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
                            ) : null}
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
                              {/* Quét AI */}
                              <button
                                onClick={() => handleAnalyzeCamera(cam.id)}
                                disabled={analyzingCameraId === cam.id}
                                title="Phân tích AI ngay cho camera này"
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                                  analyzingCameraId === cam.id
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs shadow-orange-500/20"
                                }`}
                              >
                                <Sparkles
                                  className={`w-3 h-3 ${
                                    analyzingCameraId === cam.id ? "animate-spin" : ""
                                  }`}
                                />
                                <span>{analyzingCameraId === cam.id ? "Đang quét..." : "Quét AI"}</span>
                              </button>

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

                            <div className="flex items-center gap-1">
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
                {/* Analyze Now Button */}
                <button
                  onClick={() => handleAnalyzeCamera(previewCameraSnapshot.id)}
                  disabled={analyzingCameraId === previewCameraSnapshot.id}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
                  title="Chạy phân tích AI ngay cho ảnh chụp camera này"
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 ${
                      analyzingCameraId === previewCameraSnapshot.id ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {analyzingCameraId === previewCameraSnapshot.id
                      ? "Đang quét AI..."
                      : "🔥 Phân Tích AI Ngay"}
                  </span>
                </button>

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
                {previewCameraSnapshot.latest_reading?.alert_message === "Đang chờ ảnh từ cam" ? (
                  <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Đang chờ ảnh từ cam
                  </span>
                ) : previewCameraSnapshot.latest_reading ? (
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

      {/* Queue Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cấu Hình Chu Kỳ Quét AI</h3>
                  <p className="text-xs text-slate-500">Tùy chỉnh lịch trình quét và số lượng camera</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khoảng cách giữa các chu kỳ quét (Phút):
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={configIntervalMinutes}
                  onChange={(e) => setConfigIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Mặc định: 30 phút. Chu kỳ tiếp theo sẽ đếm ngược sau khi đợt quét hiện tại hoàn tất.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng camera quét tối đa mỗi chu kỳ:
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={configMaxCameras}
                  onChange={(e) => setConfigMaxCameras(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Hệ thống tự động luân phiên (Round-Robin) dựa trên camera được quét xa nhất trong quá khứ.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleSaveQueueConfig}
                disabled={actionLoading === "config"}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                {actionLoading === "config" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Lưu Cấu Hình</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI QUEUE TASK AUDIT DETAIL MODAL ================= */}
      {selectedTaskDetail && (

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
                      #{selectedTaskDetail.id}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedTaskDetail.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700"
                        : selectedTaskDetail.status === "SKIPPED"
                        ? "bg-slate-100 text-slate-600"
                        : selectedTaskDetail.status === "PROCESSING"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-rose-100 text-rose-700"
                    }`}>
                      {selectedTaskDetail.status}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {selectedTaskDetail.task_type === "cycle_camera"
                        ? `Chu kỳ tự động #${selectedTaskDetail.cycle_id || 1}`
                        : selectedTaskDetail.task_type === "single_camera"
                        ? "Quét trực tiếp camera"
                        : selectedTaskDetail.task_type === "image_upload"
                        ? "Tải ảnh Demo"
                        : "Quét hàng loạt"}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Chi Tiết Lệnh Gọi AI: {selectedTaskDetail.camera_name || selectedTaskDetail.camera_id || "Khung hình"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Performance Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Chờ Queue</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {selectedTaskDetail.queue_wait_ms !== null && selectedTaskDetail.queue_wait_ms !== undefined
                      ? `${selectedTaskDetail.queue_wait_ms} ms`
                      : "0 ms"}
                  </div>
                  <span className="text-[10px] text-slate-400 block">Thời gian xếp hàng</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">Độ Trễ AI</span>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">
                    {selectedTaskDetail.inference_time_ms !== null && selectedTaskDetail.inference_time_ms !== undefined
                      ? `${selectedTaskDetail.inference_time_ms} ms`
                      : "0 ms"}
                  </div>
                  <span className="text-[10px] text-indigo-500 block">Thời gian Gemini suy luận</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tổng Xử Lý</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {selectedTaskDetail.duration_ms !== null && selectedTaskDetail.duration_ms !== undefined
                      ? `${selectedTaskDetail.duration_ms} ms`
                      : "0 ms"}
                  </div>
                  <span className="text-[10px] text-slate-400 block">Queue + Stream + AI</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Model & Tokens</span>
                  <div className="text-sm font-black text-slate-800 mt-0.5 truncate" title={selectedTaskDetail.model_used || "N/A"}>
                    {selectedTaskDetail.model_used || "N/A"}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {selectedTaskDetail.tokens_used ? `${selectedTaskDetail.tokens_used} tokens` : "0 tokens"}
                  </span>
                </div>
              </div>

              {/* Main Analysis and Snapshot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Hydrological Assessment */}
                <div className="md:col-span-7 space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Đánh Giá Ngập Nước (VLRDR)
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        (selectedTaskDetail.depth_level || 0) >= 3
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : (selectedTaskDetail.depth_level || 0) >= 1
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}>
                        Level {selectedTaskDetail.depth_level || 0}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {selectedTaskDetail.depth_estimate_cm_max
                          ? `${selectedTaskDetail.depth_estimate_cm_min} - ${selectedTaskDetail.depth_estimate_cm_max} cm`
                          : "0 cm (Khô ráo)"}
                      </span>
                      {selectedTaskDetail.confidence_score !== null && (
                        <span className="text-xs text-slate-500 font-medium">
                          (Độ tin cậy: {Math.round((selectedTaskDetail.confidence_score || 0) * 100)}%)
                        </span>
                      )}
                    </div>

                    {selectedTaskDetail.alert_message && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Thông báo cảnh báo:</span>
                        {selectedTaskDetail.alert_message}
                      </div>
                    )}

                    {/* Reference objects */}
                    {selectedTaskDetail.reference_objects?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                          Vật thể tham chiếu nhận diện:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTaskDetail.reference_objects.map((obj: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-100">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reasoning */}
                    {selectedTaskDetail.reasoning && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Lập luận phân tích của AI:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                          {selectedTaskDetail.reasoning}
                        </p>
                      </div>
                    )}

                    {selectedTaskDetail.error_message && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <span className="font-bold block mb-0.5">Lỗi ghi nhận:</span>
                        {selectedTaskDetail.error_message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Snapshot Image Preview */}
                <div className="md:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                      Ảnh Khung Hình Phân Tích
                    </span>
                    {selectedTaskDetail.camera_id ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-slate-200 shadow-inner">
                        <img
                          src={`${apiUrl}/api/v1/cameras/${selectedTaskDetail.camera_id}/snapshot?t=${cacheBuster}`}
                          alt="Camera Frame"
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                          {selectedTaskDetail.camera_id}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
                        Ảnh tải lên Demo
                      </div>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Góc camera:</span>
                        <span className="font-bold text-slate-800">{selectedTaskDetail.camera_angle || "elevated"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vị trí:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[180px]">{selectedTaskDetail.location_hint || "TP. Hồ Chí Minh"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Thời gian tạo:</span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {selectedTaskDetail.created_at ? new Date(selectedTaskDetail.created_at).toLocaleString("vi-VN") : "N/A"}
                        </span>
                      </div>
                      {selectedTaskDetail.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hoàn thành:</span>
                          <span className="font-mono text-[11px] text-slate-700">
                            {new Date(selectedTaskDetail.completed_at).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Audit: Raw Response & Prompts */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dữ Liệu Kỹ Thuật & Raw Response từ AI</span>
                  </span>
                  {selectedTaskDetail.raw_response && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTaskDetail.raw_response);
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

                {selectedTaskDetail.prompt_preview && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Prompt Preview:</span>
                    <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-32">
                      {selectedTaskDetail.prompt_preview}
                    </div>
                  </div>
                )}

                {selectedTaskDetail.raw_response && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Raw Gemini Model Output:</span>
                    <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                      {selectedTaskDetail.raw_response}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
              >
                Đóng Chi Tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

