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

  const handleBatchAnalyze = async (idsToAnalyze: string[]) => {
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

  const handleFakeRandomFlood = async () => {
    setActionLoading("fake-random-flood");
    try {
      const resp = await adminFetch(`${apiUrl}/api/v1/admin/test/fake-random-flood`, {
        method: "POST",
      });
      const data = await resp.json();
      if (resp.ok) {
        showToast("success", data.message || "Đã tạo ngẫu nhiên cảnh báo ngập thành công!");
        setCacheBuster(Date.now());
        await fetchDashboardData();
      } else {
        throw new Error(data.detail || "Không thể tạo dữ liệu giả lập.");
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
