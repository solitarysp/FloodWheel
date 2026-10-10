import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Navbar } from "@/components/Navbar";
import { FloodMap, GeoJsonData } from "@/components/FloodMap";
import { ZoneDetailPanel } from "@/components/ZoneDetailPanel";
import { OverrideDialog } from "@/components/OverrideDialog";
import { AlertSidebar } from "@/components/AlertSidebar";
import {
  Activity,
  CloudRain,
  Radio,
  RefreshCw,
  ShieldAlert,
  Video,
  CheckCircle2,
  Sliders,
} from "lucide-react";

export default function DashboardPage() {
  const [geoJson, setGeoJson] = useState<GeoJsonData | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>("zone-nguyen-huu-canh");
  const [selectedZoneData, setSelectedZoneData] = useState<any>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollResultNote, setPollResultNote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchHeatmap = async () => {
    try {
      const resp = await fetch(`${apiUrl}/api/v1/flood/heatmap`);
      if (resp.ok) {
        const data = await resp.json();
        setGeoJson(data);
      }
    } catch (err) {
      console.error("Failed to fetch heatmap:", err);
    }
  };

  const fetchZoneDetail = async (zoneId: string) => {
    try {
      const resp = await fetch(`${apiUrl}/api/v1/flood/zone/${zoneId}`);
      if (resp.ok) {
        const data = await resp.json();
        setSelectedZoneData(data);
      }
    } catch (err) {
      console.error("Failed to fetch zone detail:", err);
    }
  };

  useEffect(() => {
    fetchHeatmap().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      fetchZoneDetail(selectedZoneId);
    }
  }, [selectedZoneId]);

  const handleTriggerPollCycle = async () => {
    setIsPolling(true);
    setPollResultNote(null);
    try {
      const resp = await fetch(`${apiUrl}/api/v1/admin/poll-cycle`, { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        setPollResultNote(
          `Đã quét ${data.result?.cameras_polled || 5} camera CCTV. Điều kiện: ${data.result?.weather_condition || "Bình thường"}`
        );
        await fetchHeatmap();
        if (selectedZoneId) await fetchZoneDetail(selectedZoneId);
      }
    } catch (err: any) {
      setPollResultNote("Lỗi khi kích hoạt chu kỳ quét camera.");
    } finally {
      setIsPolling(false);
    }
  };

  const handleRevertOverride = async () => {
    if (!selectedZoneId) return;
    try {
      await fetch(`${apiUrl}/api/v1/admin/zones/${selectedZoneId}/override`, { method: "DELETE" });
      await fetchHeatmap();
      await fetchZoneDetail(selectedZoneId);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats counters
  const totalZones = geoJson?.features.length || 4;
  const severeCount = geoJson?.features.filter((f) => f.properties.depth_level >= 3).length || 2;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Head>
        <title>Trung tâm Giám sát Thoát nước — FloodWheel Operator Dashboard</title>
      </Head>

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control & Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400">Điểm nóng ngập úng</div>
              <div className="text-2xl font-black text-rose-400 mt-0.5">{severeCount} / {totalZones}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400">Camera CCTV trực tuyến</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">5 / 5</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400">Thời tiết TP.HCM (Open-Meteo)</div>
              <div className="text-sm font-bold text-sky-300 mt-1 truncate">Mưa vừa (60s cycle)</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <CloudRain className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <button
              onClick={handleTriggerPollCycle}
              disabled={isPolling}
              className="w-full h-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md shadow-blue-500/20"
            >
              <RefreshCw className={`w-4 h-4 ${isPolling ? "animate-spin" : ""}`} />
              <span>{isPolling ? "AI đang quét camera..." : "Quét camera ngay"}</span>
            </button>
          </div>
        </div>

        {/* Polling Notification Banner */}
        {pollResultNote && (
          <div className="p-3.5 rounded-2xl bg-blue-900/40 border border-blue-500/30 text-xs text-blue-200 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {pollResultNote}
            </span>
            <button onClick={() => setPollResultNote(null)} className="text-blue-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Main Grid: Heatmap + Side Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FloodMap
              geoJson={geoJson}
              onSelectZone={(id) => setSelectedZoneId(id)}
              selectedZoneId={selectedZoneId}
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Active Red Alerts Sidebar */}
            <AlertSidebar
              alerts={(geoJson?.features || [])
                .filter((f) => f.properties.depth_level >= 3)
                .map((f) => ({
                  zone_id: f.properties.zone_id,
                  name: f.properties.name,
                  district: f.properties.district,
                  depth_level: f.properties.depth_level,
                  depth_cm_min: f.properties.depth_cm_min,
                  depth_cm_max: f.properties.depth_cm_max,
                  last_updated: f.properties.last_updated,
                }))}
              onSelectZone={(id) => setSelectedZoneId(id)}
            />

            {selectedZoneData ? (
              <ZoneDetailPanel
                zoneData={selectedZoneData}
                onClose={() => setSelectedZoneData(null)}
                onOpenOverride={() => setIsOverrideOpen(true)}
                onRevertOverride={handleRevertOverride}
              />
            ) : (
              <div className="bg-slate-800/50 rounded-3xl border border-slate-800 p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <Radio className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-xs">Nhấp vào một điểm ngập trên bản đồ để xem chi tiết và lịch sử camera.</p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Override Dialog Modal */}
      {selectedZoneData && (
        <OverrideDialog
          isOpen={isOverrideOpen}
          onClose={() => setIsOverrideOpen(false)}
          zoneId={selectedZoneData.zone.id}
          zoneName={selectedZoneData.zone.name}
          currentLevel={selectedZoneData.zone.current_depth_level}
          onSuccess={() => {
            fetchHeatmap();
            if (selectedZoneId) fetchZoneDetail(selectedZoneId);
          }}
        />
      )}
    </div>
  );
}
