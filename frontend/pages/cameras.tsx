import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { CameraCard, Camera } from "../components/CameraCard";
import { CameraAnalysisModal, AnalysisResponse } from "../components/CameraAnalysisModal";
import { AddCameraModal } from "../components/AddCameraModal";
import { AiQueueBanner } from "../components/AiQueueBanner";
import {
  Camera as CameraIcon,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Activity,
  ShieldAlert,
  Radio,
  Layers,
  MapPin,
} from "lucide-react";

// Client-only dynamic import of CameraMap with custom loading placeholder
const CameraMap = dynamic(
  () => import("../components/CameraMap").then((mod) => mod.CameraMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wide">Loading HCMC Surveillance Map...</span>
      </div>
    ),
  }
);

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // 30s default
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);

  // Analysis Modal state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedCameraForAnalysis, setSelectedCameraForAnalysis] = useState<Camera | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Add Camera Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch cameras list
  const fetchCameras = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/cameras`);
      if (res.ok) {
        const data: Camera[] = await res.json();
        setCameras(data);
      }
    } catch (err) {
      console.error("Failed to fetch cameras:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Auto-refresh timer with tab backgrounding pausing
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setCacheBuster(Date.now());
      }
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval]);

  const handleRefreshAll = () => {
    setIsRefreshingAll(true);
    setCacheBuster(Date.now());
    fetchCameras();
    setTimeout(() => setIsRefreshingAll(false), 800);
  };

  const handleBatchAnalyze = async () => {
    setIsBatchAnalyzing(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/flood/analyze-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: selectedDistrict !== "all" ? selectedDistrict : null,
          limit: 10,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const flooded = data.result?.flooded_count || 0;
        const total = data.result?.total_analyzed || 0;
        alert(`Đã hoàn thành quét AI cho ${total} camera. Phát hiện ${flooded} điểm ngập nước!`);
        await fetchCameras();
      } else {
        alert("Lỗi khi chạy quét AI hàng loạt.");
      }
    } catch (err: any) {
      alert(`Lỗi quét hàng loạt: ${err.message}`);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const handleAnalyze = async (camera: Camera, capturedFrameBase64?: string) => {
    setAnalyzingId(camera.id);
    setSelectedCameraForAnalysis(camera);
    setCapturedFrame(capturedFrameBase64 || null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/cameras/${camera.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: capturedFrameBase64 || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setAnalysisResult(data);
      setIsModalOpen(true);
      // Immediately refresh camera list to display the new reading on map & cards
      fetchCameras();
    } catch (err: any) {
      alert(`Error analyzing camera snapshot: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Extract unique districts dynamically from cameras list
  const availableDistricts = React.useMemo(() => {
    const set = new Set<string>();
    cameras.forEach((c) => {
      if (c.location && c.location.trim().length > 0) {
        set.add(c.location.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedDistrict !== "all") {
      const loc = cam.location.toLowerCase();
      const target = selectedDistrict.toLowerCase();
      if (loc !== target && !loc.includes(target)) {
        return false;
      }
    }

    return true;
  });

  const onlineCount = cameras.filter((c) => c.status.toUpperCase() === "ONLINE").length;
  const sectorsCount = new Set(cameras.map((c) => c.location)).size;
  const analyzedCount = cameras.filter((c) => !!c.latest_reading).length;
  const floodedCount = cameras.filter(
    (c) => !!c.latest_reading && ((c.latest_reading.depth_level || 0) >= 1 || c.latest_reading.flood_detected)
  ).length;
  const maxFloodCm = Math.max(
    ...cameras.map((c) => c.latest_reading?.depth_estimate_cm_max || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Head>
        <title>Public Live Cameras — FloodWheel Traffic Surveillance</title>
        <meta
          name="description"
          content="Connect and view public traffic CCTV cameras in Ho Chi Minh City, with one-click AI snapshot water depth analysis powered by Gemini Vision VLRDR."
        />
      </Head>

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <CameraIcon className="w-3.5 h-3.5" />
              <span>Municipal CCTV Snapshot Grid</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Live Public Cameras & AI Flood Surveillance
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Monitor real-time municipal traffic CCTV feeds across high-risk corridors. View live{" "}
              <strong className="text-white">snapshot feeds</strong> from HCMC traffic intersections, then click{" "}
              <strong className="text-white">"Capture & Analyze"</strong> or run batch scan to measure flood depth in centimeters
              using Gemini Vision VLRDR without physical sensor hardware.
            </p>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">Total Cameras</span>
                <span className="text-xl font-bold text-white">{cameras.length} Nodes</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">AI Analyzed</span>
                <span className="text-xl font-bold text-blue-300">{analyzedCount} Feeds</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">Flooded Hotspots</span>
                <span className="text-xl font-bold text-rose-400">{floodedCount} Locations</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">Max Water Depth</span>
                <span className="text-xl font-bold text-amber-300">{maxFloodCm} cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Background Queue Status & Cycle Countdown */}
        <AiQueueBanner onDataUpdated={fetchCameras} />

        {/* Control & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cameras by name, corridor, ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle: Map View vs Grid View */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "map"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
            </div>

            {/* District Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Districts</option>
                {availableDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Refresh Interval */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value={0}>Auto-Refresh: Off</option>
                <option value={10}>Refresh: 10s</option>
                <option value={30}>Refresh: 30s</option>
                <option value={60}>Refresh: 60s</option>
              </select>
            </div>

            {/* Refresh All Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition"
              title="Refresh all camera frames"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Add Camera CTA */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition active:scale-[0.98]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Camera</span>
            </button>
          </div>
        </div>

        {/* Main Content: Map View or Grid View */}
        {loading ? (
          viewMode === "map" ? (
            <div className="w-full h-[620px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800 animate-pulse">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs font-semibold tracking-wide">Loading Surveillance Map...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="aspect-video bg-slate-200 rounded-xl" />
                  <div className="h-8 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          )
        ) : filteredCameras.length > 0 ? (
          viewMode === "map" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-700">{filteredCameras.length}</strong> cameras on interactive map. Click a marker to inspect snapshot or run AI analysis.
                </span>
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Cluster-Enabled 60fps
                </span>
              </div>
              <CameraMap
                cameras={filteredCameras}
                onAnalyze={handleAnalyze}
                onBatchAnalyze={handleBatchAnalyze}
                isBatchAnalyzing={isBatchAnalyzing}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCameras.map((camera) => (
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  cacheBuster={cacheBuster}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={analyzingId === camera.id}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
            <CameraIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Cameras Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No traffic cameras matched your current filter or search criteria. Try selecting another district or
              resetting search.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDistrict("all");
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Analysis Modal */}
      {selectedCameraForAnalysis && (
        <CameraAnalysisModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCapturedFrame(null);
          }}
          result={analysisResult}
          camera={selectedCameraForAnalysis}
          snapshotSrc={
            capturedFrame ||
            `${apiUrl}/api/v1/cameras/${selectedCameraForAnalysis.id}/snapshot?t=${cacheBuster}`
          }
        />
      )}

      {/* Add Custom Camera Modal */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCameraAdded={() => {
          fetchCameras();
          setCacheBuster(Date.now());
        }}
      />
    </div>
  );
}
