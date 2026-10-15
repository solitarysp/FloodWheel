import React from "react";
import Head from "next/head";
import { Navbar } from "../components/Navbar";
import { ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

import { useAdminDashboard } from "../components/admin/hooks/useAdminDashboard";
import { useAdminActions } from "../components/admin/hooks/useAdminActions";
import { AdminHeader } from "../components/admin/AdminHeader";
import { AdminKpiCards } from "../components/admin/AdminKpiCards";
import { AdminTabsNav } from "../components/admin/AdminTabsNav";
import { QueueTab } from "../components/admin/tabs/QueueTab";
import { CamerasTab } from "../components/admin/tabs/CamerasTab";
import { OverridesTab } from "../components/admin/tabs/OverridesTab";
import { AlertsTab } from "../components/admin/tabs/AlertsTab";
import { AdminModalsContainer } from "../components/admin/modals/AdminModalsContainer";

export default function AdminPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const d = useAdminDashboard(apiUrl);

  const a = useAdminActions(
    apiUrl,
    d.showToast,
    d.fetchDashboardData,
    d.setActionLoading,
    d.setIsConfigModalOpen,
    d.fetchQueueHistory,
    d.setSelectedTaskDetail,
    d.setIsDetailModalLoading,
    d.setCacheBuster,
    d.setAnalyzingCameraId,
    d.setIsBatchAnalyzing,
    d.setSelectedCameraIds
  );

  const toggleSelectCamera = (cameraId: string) => {
    d.setSelectedCameraIds((prev: string[]) =>
      prev.includes(cameraId) ? prev.filter((id) => id !== cameraId) : [...prev, cameraId]
    );
  };

  const filteredCameras = d.cameras.filter((cam: any) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(d.cameraSearch.toLowerCase()) ||
      cam.id.toLowerCase().includes(d.cameraSearch.toLowerCase()) ||
      (cam.location && cam.location.toLowerCase().includes(d.cameraSearch.toLowerCase()));
    const matchesStatus =
      d.cameraStatusFilter === "all" || cam.status.toUpperCase() === d.cameraStatusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    const filteredIds = filteredCameras.map((c: any) => c.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id: string) => d.selectedCameraIds.includes(id));
    if (allSelected) {
      d.setSelectedCameraIds((prev: string[]) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...d.selectedCameraIds, ...filteredIds]));
      d.setSelectedCameraIds(combined);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Head>
        <title>Admin Control Center — FloodWheel</title>
      </Head>

      <Navbar />

      {d.notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold text-white ${
              d.notification.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {d.notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{d.notification.message}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!d.isAuthenticated ? (
          <div className="max-w-md mx-auto my-16 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Administrator Access Required</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Managing the AI queue, surveillance cameras, and emergency flood overrides requires administrator authentication.
            </p>
            <button
              onClick={() => d.setIsLoginModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Login</span>
            </button>
          </div>
        ) : (
          <div>
            <AdminHeader
              adminUser={d.adminUser}
              loading={d.loading}
              actionLoading={d.actionLoading}
              onClearAllReadings={a.handleClearAllReadings}
              onFakeRandomFlood={() => d.setIsFakeFloodModalOpen(true)}
              onRefreshData={d.fetchDashboardData}
            />

            <AdminKpiCards
              overview={d.overview}
              cameras={d.cameras}
              totalCameras={d.cameras.length}
              totalZones={d.zones.length}
              totalAlerts={d.alerts.length}
              overriddenZonesCount={d.zones.filter((z) => z.is_overridden).length}
            />

            <AdminTabsNav
              activeTab={d.activeTab}
              setActiveTab={d.setActiveTab}
              camerasCount={d.cameras.length}
              zonesCount={d.zones.length}
              activeAlertsCount={d.alerts.filter((a) => a.is_active).length}
            />

            {d.activeTab === "queue" && (
              <QueueTab
                overview={d.overview}
                countdownSeconds={d.countdownSeconds}
                actionLoading={d.actionLoading}
                onTriggerQueue={a.handleTriggerQueue}
                onResumeQueue={a.handleResumeQueue}
                onPauseQueue={a.handlePauseQueue}
                onOpenConfig={() => d.setIsConfigModalOpen(true)}
                queueHistoryStats={d.queueHistoryStats}
                queueHistoryStatusFilter={d.queueHistoryStatusFilter}
                setQueueHistoryStatusFilter={d.setQueueHistoryStatusFilter}
                queueHistoryTypeFilter={d.queueHistoryTypeFilter}
                setQueueHistoryTypeFilter={d.setQueueHistoryTypeFilter}
                queueHistorySearch={d.queueHistorySearch}
                setQueueHistorySearch={d.setQueueHistorySearch}
                onSearchSubmit={(e) => {
                  e.preventDefault();
                  d.fetchQueueHistory(1);
                }}
                queueHistory={d.queueHistory}
                queueHistoryLoading={d.queueHistoryLoading}
                isDetailModalLoading={d.isDetailModalLoading}
                onViewDetail={a.handleViewTaskDetail}
                queueHistoryTotal={d.queueHistoryTotal}
                queueHistoryPage={d.queueHistoryPage}
                queueHistoryPageSize={d.queueHistoryPageSize}
                queueHistoryTotalPages={d.queueHistoryTotalPages}
                onPageChange={(p) => {
                  d.setQueueHistoryPage(p);
                  d.fetchQueueHistory(p);
                }}
                onClearHistory={a.handleClearQueueHistory}
                onRefreshHistory={() => d.fetchQueueHistory(d.queueHistoryPage)}
              />
            )}

            {d.activeTab === "cameras" && (
              <CamerasTab
                cameraSearch={d.cameraSearch}
                setCameraSearch={d.setCameraSearch}
                cameraStatusFilter={d.cameraStatusFilter}
                setCameraStatusFilter={d.setCameraStatusFilter}
                cameraViewMode={d.cameraViewMode}
                setCameraViewMode={d.setCameraViewMode}
                selectedCameraIds={d.selectedCameraIds}
                isBatchAnalyzing={d.isBatchAnalyzing}
                onBatchAnalyze={(ids) => a.handleBatchAnalyze(ids || d.selectedCameraIds)}
                filteredCameras={filteredCameras}
                onRefreshCache={() => d.setCacheBuster(Date.now())}
                onClearAllReadings={a.handleClearAllReadings}
                actionLoading={d.actionLoading}
                onSelectNone={() => d.setSelectedCameraIds([])}
                toggleSelectAll={toggleSelectAll}
                toggleSelectCamera={toggleSelectCamera}
                setPreviewCameraSnapshot={d.setPreviewCameraSnapshot}
                apiUrl={apiUrl}
                cacheBuster={d.cacheBuster}
                handleAnalyzeCamera={a.handleAnalyzeCamera}
                analyzingCameraId={d.analyzingCameraId}
                handleUpdateCameraStatus={a.handleUpdateCameraStatus}
                handleDeleteCameraReading={a.handleDeleteCameraReading}
                handleDeleteCamera={a.handleDeleteCamera}
              />
            )}

            {d.activeTab === "overrides" && (
              <OverridesTab
                zones={d.zones}
                onSetOverride={(z) => d.setSelectedZoneForOverride(z)}
                onCancelOverride={a.handleCancelOverride}
              />
            )}

            {d.activeTab === "alerts" && (
              <AlertsTab
                alerts={d.alerts}
                onResolveAlert={a.handleResolveAlert}
              />
            )}
          </div>
        )}
      </main>

      <AdminModalsContainer d={d} a={a} apiUrl={apiUrl} />
    </div>
  );
}
