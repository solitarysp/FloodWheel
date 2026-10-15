import { useState, useEffect, useCallback } from "react";
import { adminFetch, isAdminAuthenticated } from "../../../lib/auth";
import { AdminConfigData } from "../types";

export function useAdminConfig(
  apiUrl: string,
  showToast: (type: "success" | "error", message: string) => void
) {
  const [config, setConfig] = useState<AdminConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConfig = useCallback(async () => {
    if (!isAdminAuthenticated()) return;
    setLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/api/v1/admin/config`);
      if (res.ok) {
        const data: AdminConfigData = await res.json();
        setConfig(data);
      } else {
        showToast("error", "Failed to load system configuration.");
      }
    } catch (err: any) {
      console.error("Failed to fetch admin config:", err);
      showToast("error", "Error connecting to backend configuration API.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    fetchConfig,
  };
}
