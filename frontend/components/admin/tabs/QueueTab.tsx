import React from "react";
import { AdminOverview, QueueHistoryStats, QueueHistoryItem } from "../types";
import { QueueControlPanel } from "../queue/QueueControlPanel";
import { QueueStatusCard } from "../queue/QueueStatusCard";
import { QueueHistorySection } from "../queue/QueueHistorySection";

interface QueueTabProps {
  overview: AdminOverview | null;
  countdownSeconds: number;
  actionLoading: string | null;
  onTriggerQueue: () => void;
  onResumeQueue: () => void;
  onPauseQueue: () => void;
  onOpenConfig: () => void;
  queueHistoryStats: QueueHistoryStats;
  queueHistoryStatusFilter: string;
  setQueueHistoryStatusFilter: (v: string) => void;
  queueHistoryTypeFilter: string;
  setQueueHistoryTypeFilter: (v: string) => void;
  queueHistorySearch: string;
  setQueueHistorySearch: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  queueHistory: QueueHistoryItem[];
  queueHistoryLoading: boolean;
  isDetailModalLoading: boolean;
  onViewDetail: (id: string) => void;
  queueHistoryTotal: number;
  queueHistoryPage: number;
  queueHistoryPageSize: number;
  queueHistoryTotalPages: number;
  onPageChange: (newPage: number) => void;
  onClearHistory: () => void;
  onRefreshHistory: () => void;
}

export const QueueTab: React.FC<QueueTabProps> = ({
  overview,
  countdownSeconds,
  actionLoading,
  onTriggerQueue,
  onResumeQueue,
  onPauseQueue,
  onOpenConfig,
  queueHistoryStats,
  queueHistoryStatusFilter,
  setQueueHistoryStatusFilter,
  queueHistoryTypeFilter,
  setQueueHistoryTypeFilter,
  queueHistorySearch,
  setQueueHistorySearch,
  onSearchSubmit,
  queueHistory,
  queueHistoryLoading,
  isDetailModalLoading,
  onViewDetail,
  queueHistoryTotal,
  queueHistoryPage,
  queueHistoryPageSize,
  queueHistoryTotalPages,
  onPageChange,
  onClearHistory,
  onRefreshHistory,
}) => {
  return (
    <div className="space-y-6">
      <QueueControlPanel
        overview={overview}
        countdownSeconds={countdownSeconds}
        actionLoading={actionLoading}
        onTriggerQueue={onTriggerQueue}
        onResumeQueue={onResumeQueue}
        onPauseQueue={onPauseQueue}
        onOpenConfig={onOpenConfig}
      />

      <QueueStatusCard
        overview={overview}
        countdownSeconds={countdownSeconds}
        actionLoading={actionLoading}
        onResumeQueue={onResumeQueue}
        onTriggerQueue={onTriggerQueue}
      />

      <QueueHistorySection
        queueHistoryStats={queueHistoryStats}
        queueHistoryStatusFilter={queueHistoryStatusFilter}
        setQueueHistoryStatusFilter={setQueueHistoryStatusFilter}
        queueHistoryTypeFilter={queueHistoryTypeFilter}
        setQueueHistoryTypeFilter={setQueueHistoryTypeFilter}
        queueHistorySearch={queueHistorySearch}
        setQueueHistorySearch={setQueueHistorySearch}
        onSearchSubmit={onSearchSubmit}
        queueHistory={queueHistory}
        queueHistoryLoading={queueHistoryLoading}
        isDetailModalLoading={isDetailModalLoading}
        onViewDetail={onViewDetail}
        queueHistoryTotal={queueHistoryTotal}
        queueHistoryPage={queueHistoryPage}
        queueHistoryPageSize={queueHistoryPageSize}
        queueHistoryTotalPages={queueHistoryTotalPages}
        onPageChange={onPageChange}
        onClearHistory={onClearHistory}
        actionLoading={actionLoading}
        onRefresh={onRefreshHistory}
      />
    </div>
  );
};
