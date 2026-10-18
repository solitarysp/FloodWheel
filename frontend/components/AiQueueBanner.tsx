import React from "react";
import { QueueStatus } from "../types/queue";
import { useAiQueue } from "../hooks/useAiQueue";
import { QueueStatusBadge } from "./queue/QueueStatusBadge";
import { QueueMetricsView } from "./queue/QueueMetricsView";
import { QueueControlButtons } from "./queue/QueueControlButtons";

export type { QueueStatus };

interface AiQueueBannerProps {
  onDataUpdated?: () => void;
  className?: string;
}

export const AiQueueBanner: React.FC<AiQueueBannerProps> = ({ onDataUpdated, className = "" }) => {
  const {
    status,
    secondsRemaining,
    isTriggering,
    isPausing,
    handleTriggerNow,
    handleTogglePause,
  } = useAiQueue(onDataUpdated);

  if (!status) return null;

  const isRunning = status.status === "running";
  const isPaused = status.status === "paused";

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 border shadow-md ${
        isRunning
          ? "bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-slate-900 border-blue-500/40 text-white"
          : isPaused
          ? "bg-slate-900/90 border-slate-700 text-slate-300"
          : "bg-slate-900/90 border-indigo-500/30 text-white"
      } ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Section: Status & Details */}
        <div className="space-y-2 flex-1">
          <QueueStatusBadge status={status} />
          <QueueMetricsView status={status} secondsRemaining={secondsRemaining} />
        </div>

        {/* Right Section: Action Controls */}
        <QueueControlButtons
          status={status}
          isTriggering={isTriggering}
          isPausing={isPausing}
          onTriggerNow={handleTriggerNow}
          onTogglePause={handleTogglePause}
        />
      </div>
    </div>
  );
};
