export interface QueueHistoryStats {
  total_calls: number;
  completed_count: number;
  flooded_count: number;
  failed_count: number;
  skipped_count: number;
  avg_inference_ms: number;
}

export interface QueueHistoryItem {
  id: number;
  task_type: string;
  cycle_id?: number;
  camera_id?: string;
  camera_name?: string;
  status: string;
  depth_level?: number;
  depth_estimate_cm_max?: number;
  depth_estimate_cm_min?: number;
  model_used?: string;
  inference_time_ms?: number;
  tokens_used?: number;
  queue_wait_ms?: number;
  duration_ms?: number;
  created_at?: string;
  completed_at?: string;
  confidence_score?: number;
  alert_message?: string;
  reference_objects?: string[];
  reasoning?: string;
  error_message?: string;
  camera_angle?: string;
  location_hint?: string;
  raw_response?: string;
  prompt_preview?: string;
}

export interface AdminOverview {
  cameras?: {
    total: number;
    online: number;
    offline: number;
  };
  queue?: {
    status: string;
    next_run_in_seconds?: number;
    interval_minutes?: number;
    max_cameras_per_cycle?: number;
  };
  zones?: {
    total: number;
    overridden: number;
  };
  alerts?: {
    active_count: number;
  };
}

export interface AdminZone {
  id: string;
  name: string;
  district: string;
  current_depth_level: number;
  current_depth_cm_min: number;
  current_depth_cm_max: number;
  is_overridden: boolean;
}

export interface AdminAlert {
  id: number;
  zone_id: string;
  level: number;
  message: string;
  is_active: boolean;
  created_at?: string;
}

export interface AdminConfigData {
  ai: {
    concurrency: number;
    primary_model: string;
    fallback_model: string;
    min_call_interval_seconds: number;
    api_keys_count: number;
  };
  queue: {
    interval_minutes: number;
    max_cameras_per_cycle: number;
    auto_start: boolean;
    cache_minutes: number;
    status: string;
    is_processing: boolean;
  };
  system: {
    environment: string;
    log_level: string;
    camera_backend_url: string;
    snapshot_storage_dir: string;
    database_url: string;
    redis_url: string;
    cors_origins: string[];
    max_image_size_mb: number;
    max_images_per_request: number;
  };
}

