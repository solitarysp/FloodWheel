import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Clock, Play, Pause, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

export interface QueueStatus {
  is_running: boolean;
  status: "idle" | "running" | "paused" | "error";
  is_processing: boolean;
  is_paused: boolean;
  interval_seconds: number;
  interval_minutes: number;
  current_camera_id: string | null;
  current_camera_name: string | null;
  queue_length: number;
  current_cycle_id: number;
  cycle_progress: {
    cycle_id: number;
    total: number;
    processed: number;
    success: number;
    skipped?: number;
    failed: number;
    flooded: number;
  };
  last_cycle_started_at: string | null;
  last_cycle_completed_at: string | null;
  next_run_at: string | null;
  next_run_in_seconds: number;
  last_cycle_summary: {
    cycle_id?: number;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
    total_cameras?: number;
    successful?: number;
    skipped?: number;
    failed?: number;
    flooded_count?: number;
    max_depth_cm?: number;
  };
  recent_results?: Array<{
    camera_id: string;
    camera_name?: string;
    success: boolean;
    flood_detected?: boolean;
    depth_level?: number;
    depth_cm_max?: number;
  }>;
}

interface AiQueueBannerProps {
  onDataUpdated?: () => void;
  className?: string;
}

export const AiQueueBanner: React.FC<AiQueueBannerProps> = ({ onDataUpdated, className = "" }) => {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const prevCycleIdRef = useRef<number>(0);
  const prevProcessedRef = useRef<number>(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Poll status from backend
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/flood/queue/status`);
      if (res.ok) {
        const data: QueueStatus = await res.json();
        setStatus(data);
        if (data.next_run_in_seconds != null) {
          setSecondsRemaining(data.next_run_in_seconds);
        }

        // Trigger parent refresh if cycle progressed or finished
        if (
          onDataUpdated &&
          (data.current_cycle_id !== prevCycleIdRef.current ||
            data.cycle_progress?.processed !== prevProcessedRef.current)
        ) {
          prevCycleIdRef.current = data.current_cycle_id;
          prevProcessedRef.current = data.cycle_progress?.processed || 0;
          onDataUpdated();
        }
      }
    } catch (err) {
      // silent network catch
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll faster when processing, slower when idle
    const interval = setInterval(fetchStatus, status?.is_processing ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [status?.is_processing]);

  // Local second-by-second countdown ticker for smooth UI
  useEffect(() => {
    if (secondsRemaining <= 0 || status?.status !== "idle") return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, status?.status]);

  const handleTriggerNow = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/flood/queue/trigger`, { method: "POST" });
      if (res.ok) {
        await fetchStatus();
        if (onDataUpdated) onDataUpdated();
      }
    } catch (err) {
      console.error("Trigger queue error:", err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTogglePause = async () => {
    if (!status) return;
    setIsPausing(true);
    const endpoint = status.is_paused ? "resume" : "pause";
    try {
      const res = await fetch(`${apiUrl}/api/v1/flood/queue/${endpoint}`, { method: "POST" });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error("Toggle pause error:", err);
    } finally {
      setIsPausing(false);
    }
  };

  // Format countdown string MM:SS
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} phút ${s < 10 ? "0" : ""}${s} giây`;
  };

  if (!status) return null;

  const isRunning = status.status === "running";
  const isPaused = status.status === "paused";
  const progress = status.cycle_progress;
  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

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
          <div className="flex flex-wrap items-center gap-2.5">
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <Sparkles className="w-3.5 h-3.5" />
                AI Đang Phân Tích Ảnh Camera (Chu kỳ #{status.current_cycle_id})
              </span>
            ) : isPaused ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Pause className="w-3.5 h-3.5" />
                Hàng Đợi Đang Tạm Dừng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Clock className="w-3.5 h-3.5" />
                Hàng Đợi Chờ Lần Quét Kế Tiếp
              </span>
            )}

            {/* Interval explanation badge */}
            <span className="text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
              Chu kỳ: 30 phút sau khi lần chạy cuối hoàn tất
            </span>
          </div>

          {/* Dynamic Status Text */}
          {isRunning ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                <span className="truncate">
                  Đang xử lý:{" "}
                  <strong className="text-blue-300 font-semibold">
                    {status.current_camera_name || status.current_camera_id || "Đang tải ảnh..."}
                  </strong>
                </span>
                <span className="font-mono text-blue-300">
                  {progress.processed} / {progress.total} ({progressPercent}%)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Đã quét: <strong className="text-emerald-400">{progress.success}</strong></span>
                <span>Điểm ngập: <strong className="text-rose-400">{progress.flooded}</strong></span>
                {(progress.skipped || 0) > 0 && (
                  <span>Bỏ qua (ảnh default): <strong className="text-slate-300">{progress.skipped}</strong></span>
                )}
                {progress.failed > 0 && <span>Lỗi: <strong className="text-amber-400">{progress.failed}</strong></span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <div>
                Thời gian chạy tiếp theo:{" "}
                <strong className="text-amber-300 font-bold font-mono text-sm">
                  {secondsRemaining > 0 ? formatCountdown(secondsRemaining) : "Chuẩn bị khởi chạy..."}
                </strong>
              </div>

              {/* Last cycle metrics summary */}
              {status.last_cycle_summary?.total_cameras != null && (
                <div className="flex items-center gap-2 text-slate-400 text-[11px] border-l border-slate-700 pl-3">
                  <span>Lần chạy trước:</span>
                  <span className="text-slate-200 font-semibold">
                    {status.last_cycle_summary.total_cameras} camera
                  </span>
                  <span>•</span>
                  <span className="text-rose-400 font-semibold">
                    {status.last_cycle_summary.flooded_count} điểm ngập
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">
                    Sâu nhất: {status.last_cycle_summary.max_depth_cm}cm
                  </span>
                  {(status.last_cycle_summary.skipped || 0) > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">
                        Bỏ qua default: {status.last_cycle_summary.skipped}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-slate-400">
                    {status.last_cycle_summary.duration_seconds}s
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={handleTriggerNow}
            disabled={isTriggering || isRunning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition active:scale-95"
            title="Chạy phân tích AI ngay lập tức không cần chờ 30 phút"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering || isRunning ? "animate-spin text-amber-300" : ""}`} />
            <span>{isRunning ? "Đang chạy..." : "⚡ Phân tích ngay"}</span>
          </button>

          <button
            onClick={handleTogglePause}
            disabled={isPausing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title={isPaused ? "Tiếp tục chạy tự động" : "Tạm dừng tự động"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
