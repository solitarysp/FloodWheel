import React, { useState, useEffect, useRef } from "react";
import {
  Camera as CameraIcon,
  RefreshCw,
  Sparkles,
  MapPin,
  Radio,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Play,
} from "lucide-react";

declare global {
  interface Window {
    Hls?: any;
  }
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  camera_angle: string;
  stream_url: string;
  video_url?: string;
  zone_id: string;
  status: string;
}

interface CameraCardProps {
  camera: Camera;
  cacheBuster: number;
  onAnalyze: (camera: Camera, capturedFrameBase64?: string) => Promise<void>;
  isAnalyzing: boolean;
  onRefreshOne?: (cameraId: string) => void;
}

const loadHlsScript = (): Promise<any> => {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is undefined"));
  if (window.Hls) return Promise.resolve(window.Hls);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("hls-script") as HTMLScriptElement | null;
    if (existing) {
      if (window.Hls) {
        resolve(window.Hls);
        return;
      }
      existing.addEventListener("load", () => resolve(window.Hls));
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "hls-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.8/hls.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Hls) {
        resolve(window.Hls);
      } else {
        reject(new Error("Hls object not found on window"));
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

export const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  cacheBuster,
  onAnalyze,
  isAnalyzing,
  onRefreshOne,
}) => {
  const [viewMode, setViewMode] = useState<"stream" | "snapshot">(
    camera.video_url ? "stream" : "snapshot"
  );
  const [localBuster, setLocalBuster] = useState(cacheBuster);
  const [imgError, setImgError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  const effectiveBuster = localBuster || cacheBuster;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const snapshotSrc = `${apiUrl}/api/v1/cameras/${camera.id}/snapshot?t=${effectiveBuster}`;

  // Handle HLS live stream video initialization
  useEffect(() => {
    if (viewMode !== "stream" || !camera.video_url) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    setIsStreamLoading(true);
    setStreamError(false);

    // 1. Native HLS support (Safari / iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = camera.video_url;
      const onLoadedMetadata = () => {
        if (!destroyed) {
          setIsStreamLoading(false);
          video.play().catch(() => {});
        }
      };
      const onError = () => {
        if (!destroyed) {
          setStreamError(true);
          setIsStreamLoading(false);
        }
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("error", onError);

      return () => {
        destroyed = true;
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
      };
    }

    // 2. MediaSource / HLS.js support (Chrome, Firefox, Edge)
    loadHlsScript()
      .then((Hls) => {
        if (destroyed) return;
        if (!Hls || !Hls.isSupported()) {
          setStreamError(true);
          setIsStreamLoading(false);
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 10,
        });
        hlsRef.current = hls;

        hls.loadSource(camera.video_url!);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) {
            setIsStreamLoading(false);
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data && data.fatal) {
            if (!destroyed) {
              setStreamError(true);
              setIsStreamLoading(false);
            }
            try {
              hls.destroy();
            } catch (_) {}
          }
        });
      })
      .catch(() => {
        if (!destroyed) {
          setStreamError(true);
          setIsStreamLoading(false);
        }
      });

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [viewMode, camera.video_url]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setImgError(false);
    const nextBuster = Date.now();
    setLocalBuster(nextBuster);
    if (onRefreshOne) onRefreshOne(camera.id);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleCaptureAndAnalyze = async () => {
    let capturedBase64: string | undefined = undefined;

    if (viewMode === "stream" && videoRef.current) {
      const video = videoRef.current;
      try {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            capturedBase64 = canvas.toDataURL("image/jpeg", 0.9);
          }
        }
      } catch (err) {
        // If cross-origin restrictions taint canvas, smoothly fall back to server proxy
        console.warn("Direct video canvas capture blocked by CORS, falling back to server snapshot proxy:", err);
        capturedBase64 = undefined;
      }
    }

    await onAnalyze(camera, capturedBase64);
  };

  const getAngleLabel = (angle: string) => {
    switch (angle) {
      case "street_level":
        return "Street Level (~2m)";
      case "overhead":
        return "Overhead (>8m)";
      case "elevated":
      default:
        return "Elevated Pole (~5m)";
    }
  };

  const isOnline = camera.status.toUpperCase() === "ONLINE";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {camera.status}
            </span>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {camera.id}
            </span>
            {camera.video_url && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                HLS .m3u8
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm truncate" title={camera.name}>
            {camera.name}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{camera.location}</span>
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          title="Refresh camera snapshot"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Mode Switcher Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg">
          {camera.video_url && (
            <button
              type="button"
              onClick={() => {
                setViewMode("stream");
                setStreamError(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                viewMode === "stream"
                  ? "bg-white text-blue-700 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Video className="w-3 h-3 text-blue-600" />
              <span>Live Stream (.m3u8)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewMode("snapshot")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === "snapshot"
                ? "bg-white text-blue-700 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3 h-3 text-slate-500" />
            <span>Snapshot Feed</span>
          </button>
        </div>

        {camera.video_url && (
          <a
            href={camera.video_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open raw .m3u8 stream in external player or new tab"
            className="text-[11px] text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1 hover:underline ml-2"
          >
            <span>Raw Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Camera Live Media Viewport */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden group">
        {viewMode === "stream" && camera.video_url ? (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              controls
              className="w-full h-full object-cover"
            />

            {/* Connecting Spinner Overlay */}
            {isStreamLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white z-10 pointer-events-none">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
                <p className="text-xs font-medium">Connecting HLS Stream...</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Fetching .m3u8 chunks</p>
              </div>
            )}

            {/* Stream Failure Fallback Screen */}
            {streamError && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-slate-300 z-10">
                <AlertTriangle className="w-7 h-7 text-amber-400 mb-1.5" />
                <p className="text-xs font-semibold text-white">Live Stream Unreachable</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Browser may block cross-origin HTTP stream or stream is currently buffering.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setViewMode("snapshot")}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    View Snapshot Feed
                  </button>
                  <a
                    href={camera.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition flex items-center gap-1"
                  >
                    <span>External VLC</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Live OSD Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>LIVE HLS</span>
            </div>
          </>
        ) : (
          <>
            {!imgError ? (
              <img
                src={snapshotSrc}
                alt={camera.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-400">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs font-medium">Snapshot Stream Offline</p>
                <button
                  onClick={handleManualRefresh}
                  className="mt-2 text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Connection
                </button>
              </div>
            )}

            {/* Live OSD Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SNAPSHOT</span>
            </div>
          </>
        )}

        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-slate-200 px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 pointer-events-none">
          {getAngleLabel(camera.camera_angle)}
        </div>

        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 pointer-events-none">
          {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
        </div>
      </div>

      {/* Card Actions & AI Analysis */}
      <div className="p-4 bg-slate-50/50 mt-auto border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-mono">
          <span className="text-slate-400">Zone: </span>
          <span className="font-semibold text-slate-700">{camera.zone_id || "Unassigned"}</span>
        </div>

        <button
          onClick={handleCaptureAndAnalyze}
          disabled={isAnalyzing}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 ${
            isAnalyzing
              ? "bg-blue-400 text-white cursor-wait"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]"
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Frame...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Capture & Analyze</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
