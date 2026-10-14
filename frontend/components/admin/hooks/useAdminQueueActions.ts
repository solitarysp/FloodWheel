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
        showToast("success", "Queue cycle configuration updated successfully!");
        setIsConfigModalOpen(false);
        await fetchDashboardData();
      } else {
        throw new Error("Unable to update AI queue configuration.");
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
        showToast("success", "Triggered immediate AI scan cycle!");
        await fetchDashboardData();
        await fetchQueueHistory(1);
      } else {
        throw new Error("Unable to trigger AI queue.");
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
        showToast("success", "Paused automatic AI scan queue.");
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
        showToast("success", "Resumed automatic AI scan queue.");
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
        showToast("error", "Unable to load task details.");
      }
    } catch (err: any) {
      showToast("error", `Error loading task details: ${err.message}`);
    } finally {
      setIsDetailModalLoading(false);
    }
  };

  const handleClearQueueHistory = async () => {
    if (!confirm("Are you sure you want to delete all AI queue audit history in the database?")) return;
    setActionLoading("clear-history");
    try {
      const res = await adminFetch(`${apiUrl}/api/v1/admin/queue/history`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "Deleted all AI queue audit records in the database.");
        await fetchQueueHistory(1);
        await fetchDashboardData();
      } else {
        showToast("error", "Unable to delete queue history.");
      }
    } catch (err: any) {
      showToast("error", `Error deleting history: ${err.message}`);
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
