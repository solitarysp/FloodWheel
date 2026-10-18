import React from "react";
import { OverrideDialog } from "../../OverrideDialog";
import { AdminLoginModal } from "../../AdminLoginModal";
import { CameraPreviewModal } from "./CameraPreviewModal";
import { QueueConfigModal } from "./QueueConfigModal";
import { QueueTaskDetailModal } from "./QueueTaskDetailModal";
import { FakeFloodModal } from "./FakeFloodModal";
import { getAdminUser } from "../../../lib/auth";

interface AdminModalsContainerProps {
  d: any;
  a: any;
  apiUrl: string;
}

export const AdminModalsContainer: React.FC<AdminModalsContainerProps> = ({ d, a, apiUrl }) => {
  return (
    <>
      <FakeFloodModal
        isOpen={d.isFakeFloodModalOpen}
        onClose={() => d.setIsFakeFloodModalOpen(false)}
        onSubmit={a.handleFakeRandomFlood}
        isLoading={d.actionLoading === "fake-random-flood"}
        totalCamerasCount={d.cameras?.length || 20}
      />

      {d.selectedZoneForOverride && (
        <OverrideDialog
          isOpen={true}
          onClose={() => d.setSelectedZoneForOverride(null)}
          zoneId={d.selectedZoneForOverride.id}
          zoneName={d.selectedZoneForOverride.name}
          currentLevel={d.selectedZoneForOverride.current_depth_level}
          onSuccess={() => {
            d.showToast("success", `Updated override for ${d.selectedZoneForOverride?.name}`);
            d.fetchDashboardData();
          }}
        />
      )}

      <AdminLoginModal
        isOpen={d.isLoginModalOpen}
        onClose={() => d.setIsLoginModalOpen(false)}
        onSuccess={() => {
          d.setIsAuthenticated(true);
          d.setAdminUser(getAdminUser());
        }}
      />

      <CameraPreviewModal
        camera={d.previewCameraSnapshot}
        onClose={() => d.setPreviewCameraSnapshot(null)}
        cacheBuster={d.cacheBuster}
        onRefreshCache={() => d.setCacheBuster(Date.now())}
        analyzingCameraId={d.analyzingCameraId}
        onAnalyzeCamera={a.handleAnalyzeCamera}
        apiUrl={apiUrl}
      />

      <QueueConfigModal
        isOpen={d.isConfigModalOpen}
        onClose={() => d.setIsConfigModalOpen(false)}
        configIntervalMinutes={d.configIntervalMinutes}
        setConfigIntervalMinutes={d.setConfigIntervalMinutes}
        configMaxCameras={d.configMaxCameras}
        setConfigMaxCameras={d.setConfigMaxCameras}
        actionLoading={d.actionLoading}
        onSave={() => a.handleSaveQueueConfig(d.configIntervalMinutes, d.configMaxCameras)}
      />

      <QueueTaskDetailModal
        task={d.selectedTaskDetail}
        onClose={() => d.setSelectedTaskDetail(null)}
        cacheBuster={d.cacheBuster}
        apiUrl={apiUrl}
      />
    </>
  );
};
