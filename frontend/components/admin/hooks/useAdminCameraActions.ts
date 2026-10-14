import { adminFetch } from "../../../lib/auth";

export function useAdminCameraActions(
  apiUrl: string,
  showToast: (type: "success" | "error", message: string) => void,
  fetchDashboardData: () => Promise<void>,
  setActionLoading: (loading: string | null) => void,
  setCacheBuster: (v: any) => void,
  setAnalyzingCameraId: (id: string | null) => void,
  setIsBatchAnalyzing: (v: boolean) => void,
  setSelectedCameraIds: (ids: any) => void
) {
  const handleUpdateCameraStatus = async (cameraId: string, newStatus: string) => {
    setActionLoading(`cam-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (resp.ok) {
        showToast("success", `Changed status of camera ${cameraId} to ${newStatus}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Unable to update camera status.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCamera = async (cameraId: string, cameraName: string) => {
    if (!confirm(`Are you sure you want to delete camera "${cameraName}" (${cameraId})?`)) return;

    setActionLoading(`del-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Deleted camera ${cameraName} successfully.`);
        await fetchDashboardData();
      } else {
        throw new Error("Unable to delete camera.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCameraReading = async (cameraId: string, cameraName?: string) => {
    if (!confirm(`Are you sure you want to delete AI analysis reading for camera "${cameraName || cameraId}"?`)) return;

    setActionLoading(`del-reading-${cameraId}`);
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/cameras/${cameraId}/readings`, {
        method: "DELETE",
      });
      if (resp.ok) {
        showToast("success", `Deleted AI analysis reading for camera ${cameraName || cameraId}.`);
        await fetchDashboardData();
      } else {
        throw new Error("Unable to delete analysis reading.");
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
        "WARNING: Are you sure you want to delete ALL AI analysis readings and reset all zones to normal (Level 0)?"
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
        showToast("success", data.message || "Deleted all AI analysis readings successfully!");
        await fetchDashboardData();
      } else {
        throw new Error("Unable to delete all analysis readings.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

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
          showToast("success", `Camera ${cameraId}: Waiting for frame (mock frame, skipped AI)`);
        } else {
          showToast(
            "success",
            `Analysis completed for ${cameraId}: Level ${data.depth_level ?? 0} (${data.depth_cm_max || 0} cm)`
          );
        }
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Error analyzing camera.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setAnalyzingCameraId(null);
    }
  };

  const handleBatchAnalyze = async (idsToAnalyze: string[]) => {
    if (idsToAnalyze.length === 0) {
      showToast("error", "Please select at least 1 camera for AI analysis.");
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
          `Completed scan for ${idsToAnalyze.length} cameras: ${data.analyzed_count} success, ${data.skipped_count} waiting for live feed, ${data.error_count} failed.`
        );
        setSelectedCameraIds([]);
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Error during batch analysis.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const handleFakeRandomFlood = async () => {
    setActionLoading("fake-random-flood");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/test/fake-random-flood`, {
        method: "POST",
      });
      const data = await resp.json();
      if (resp.ok) {
        showToast("success", data.message || "Generated random flood alerts successfully!");
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Unable to generate simulation data.");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return {
    handleUpdateCameraStatus,
    handleDeleteCamera,
    handleDeleteCameraReading,
    handleClearAllReadings,
    handleAnalyzeCamera,
    handleBatchAnalyze,
    handleFakeRandomFlood,
  };
}
