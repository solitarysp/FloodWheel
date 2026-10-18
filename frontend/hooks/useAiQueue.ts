import { useState, useEffect, useRef } from "react";
import { QueueStatus } from "../types/queue";

export function useAiQueue(onDataUpdated?: () => void) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const prevCycleIdRef = useRef<number>(0);
  const prevProcessedRef = useRef<number>(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/flood/queue/status`);
      if (res.ok) {
        const data: QueueStatus = await res.json();
        setStatus(data);
        if (data.next_run_in_seconds != null) {
          setSecondsRemaining(data.next_run_in_seconds);
        }

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
    const interval = setInterval(fetchStatus, status?.is_processing ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [status?.is_processing]);

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

  return {
    status,
    secondsRemaining,
    isTriggering,
    isPausing,
    handleTriggerNow,
    handleTogglePause,
  };
}
