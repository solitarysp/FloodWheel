import { useState, useEffect } from "react";
import { adminFetch, getAdminUser, isAdminAuthenticated } from "../../../lib/auth";
import { AdminOverview, AdminZone, AdminAlert, QueueHistoryStats, QueueHistoryItem } from "../types";

export function useAdminDashboard(apiUrl: string) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"queue" | "cameras" | "overrides" | "alerts">("queue");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [isAddCameraOpen, setIsAddCameraOpen] = useState<boolean>(false);
  const [selectedZoneForOverride, setSelectedZoneForOverride] = useState<AdminZone | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configIntervalMinutes, setConfigIntervalMinutes] = useState<number>(30);
  const [configMaxCameras, setConfigMaxCameras] = useState<number>(15);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  const [cameraSearch, setCameraSearch] = useState<string>("");
  const [cameraStatusFilter, setCameraStatusFilter] = useState<string>("all");
  const [cameraViewMode, setCameraViewMode] = useState<"table" | "grid">("table");
  const [previewCameraSnapshot, setPreviewCameraSnapshot] = useState<any>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [analyzingCameraId, setAnalyzingCameraId] = useState<string | null>(null);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  const [queueHistory, setQueueHistory] = useState<QueueHistoryItem[]>([]);
  const [queueHistoryTotal, setQueueHistoryTotal] = useState<number>(0);
  const [queueHistoryPage, setQueueHistoryPage] = useState<number>(1);
  const [queueHistoryPageSize] = useState<number>(12);
  const [queueHistoryTotalPages, setQueueHistoryTotalPages] = useState<number>(1);
  const [queueHistoryStats, setQueueHistoryStats] = useState<QueueHistoryStats>({
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
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<QueueHistoryItem | null>(null);
  const [isDetailModalLoading, setIsDetailModalLoading] = useState<boolean>(false);

  useEffect(() => {
    const authed = isAdminAuthenticated();
    setIsAuthenticated(authed);
    setAdminUser(getAdminUser());
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDashboardData = async () => {
    if (!isAdminAuthenticated()) return;
    setLoading(true);

    try {
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

      const camResp = await adminFetch(`${apiUrl}/api/v1/cameras?limit=500`);
      if (camResp.ok) {
        const camData = await camResp.json();
        setCameras(camData);
      }

      const zoneResp = await adminFetch(`${apiUrl}/api/v1/admin/zones`);
      if (zoneResp.ok) {
        const zoneData = await zoneResp.json();
        setZones(zoneData.items || []);
      }

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
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      const isRunning = overview?.queue?.status === "running";
      const pollMs = isRunning ? 3000 : 15000;
      const interval = setInterval(fetchDashboardData, pollMs);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, overview?.queue?.status]);

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

  useEffect(() => {
    if (isAuthenticated && activeTab === "queue") {
      fetchQueueHistory(1);
    }
  }, [isAuthenticated, activeTab, queueHistoryStatusFilter, queueHistoryTypeFilter]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    adminUser,
    setAdminUser,
    isLoginModalOpen,
    setIsLoginModalOpen,
    activeTab,
    setActiveTab,
    overview,
    cameras,
    zones,
    alerts,
    loading,
    actionLoading,
    setActionLoading,
    notification,
    showToast,
    fetchDashboardData,
    isAddCameraOpen,
    setIsAddCameraOpen,
    selectedZoneForOverride,
    setSelectedZoneForOverride,
    isConfigModalOpen,
    setIsConfigModalOpen,
    configIntervalMinutes,
    setConfigIntervalMinutes,
    configMaxCameras,
    setConfigMaxCameras,
    countdownSeconds,
    cameraSearch,
    setCameraSearch,
    cameraStatusFilter,
    setCameraStatusFilter,
    cameraViewMode,
    setCameraViewMode,
    previewCameraSnapshot,
    setPreviewCameraSnapshot,
    cacheBuster,
    setCacheBuster,
    selectedCameraIds,
    setSelectedCameraIds,
    analyzingCameraId,
    setAnalyzingCameraId,
    isBatchAnalyzing,
    setIsBatchAnalyzing,
    queueHistory,
    queueHistoryTotal,
    queueHistoryPage,
    setQueueHistoryPage,
    queueHistoryPageSize,
    queueHistoryTotalPages,
    queueHistoryStats,
    queueHistoryStatusFilter,
    setQueueHistoryStatusFilter,
    queueHistoryTypeFilter,
    setQueueHistoryTypeFilter,
    queueHistorySearch,
    setQueueHistorySearch,
    queueHistoryLoading,
    fetchQueueHistory,
    selectedTaskDetail,
    setSelectedTaskDetail,
    isDetailModalLoading,
    setIsDetailModalLoading,
  };
}
