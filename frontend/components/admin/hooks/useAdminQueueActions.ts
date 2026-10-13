import { adminFetch } from "../../../lib/auth";

export function useAdminQueueActions(
  apiUrl: string,
  showToast: (type: "success" | "error", message: string) => void,
  fetchDashboardData: () => Promise<void>,
  setActionLoading: (loading: string | null) => void,
  setIsConfigModalOpen: (open: boolean) => void,
  fetchQueueHistory: (page?: number) => Promise<void>,
  setSelectedTaskDetail: (task: any) => void,
  setIsDetailModalLoading: (loading: boolean) => void
) {
  const handleSaveQueueConfig = async (configIntervalMinutes: number, configMaxCameras: number) => {
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

  return {
    handleSaveQueueConfig,
    handleTriggerQueue,
    handlePauseQueue,
    handleResumeQueue,
    handleViewTaskDetail,
    handleClearQueueHistory,
  };
}
