import { useAdminQueueActions } from "./useAdminQueueActions";
import { useAdminCameraActions } from "./useAdminCameraActions";
import { useAdminZoneAlertActions } from "./useAdminZoneAlertActions";

export function useAdminActions(
  apiUrl: string,
  showToast: (type: "success" | "error", message: string) => void,
  fetchDashboardData: () => Promise<void>,
  setActionLoading: (loading: string | null) => void,
  setIsConfigModalOpen: (open: boolean) => void,
  fetchQueueHistory: (page?: number) => Promise<void>,
  setSelectedTaskDetail: (task: any) => void,
  setIsDetailModalLoading: (loading: boolean) => void,
  setCacheBuster: (v: any) => void,
  setAnalyzingCameraId: (id: string | null) => void,
  setIsBatchAnalyzing: (v: boolean) => void,
  setSelectedCameraIds: (ids: any) => void
) {
  const queueActions = useAdminQueueActions(
    apiUrl,
    showToast,
    fetchDashboardData,
    setActionLoading,
    setIsConfigModalOpen,
    fetchQueueHistory,
    setSelectedTaskDetail,
    setIsDetailModalLoading
  );

  const cameraActions = useAdminCameraActions(
    apiUrl,
    showToast,
    fetchDashboardData,
    setActionLoading,
    setCacheBuster,
    setAnalyzingCameraId,
    setIsBatchAnalyzing,
    setSelectedCameraIds
  );

  const zoneAlertActions = useAdminZoneAlertActions(
    apiUrl,
    showToast,
    fetchDashboardData,
    setActionLoading
  );

  return {
    ...queueActions,
    ...cameraActions,
    ...zoneAlertActions,
  };
}
