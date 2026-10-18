import { adminFetch } from "../../../lib/auth";

export function useAdminZoneAlertActions(
  apiUrl: string,
  showToast: (type: "success" | "error", message: string) => void,
  fetchDashboardData: () => Promise<void>,
  setActionLoading: (loading: string | null) => void
) {
  const handleCancelOverride = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Cancel manual override for zone "${zoneName}" and return to AI automatic mode?`)) return;

    setActionLoading(`override-${zoneId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/zones/${zoneId}/override`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Cancelled override for ${zoneName}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Failed to cancel override.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    setActionLoading(`alert-${alertId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      if (resp.ok) {
        showToast("success", `Resolved alert #${alertId}.`);
        await fetchDashboardData();
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return {
    handleCancelOverride,
    handleResolveAlert,
  };
}
