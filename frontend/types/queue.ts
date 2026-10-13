export interface QueueProgress {
  cycle_id: number;
  total: number;
  processed: number;
  success: number;
  skipped?: number;
  failed: number;
  flooded: number;
}

export interface QueueLastCycleSummary {
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
}

export interface QueueRecentResult {
  camera_id: string;
  camera_name?: string;
  success: boolean;
  flood_detected?: boolean;
  depth_level?: number;
  depth_cm_max?: number;
}

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
  cycle_progress: QueueProgress;
  last_cycle_started_at: string | null;
  last_cycle_completed_at: string | null;
  next_run_at: string | null;
  next_run_in_seconds: number;
  last_cycle_summary: QueueLastCycleSummary;
  recent_results?: QueueRecentResult[];
}
