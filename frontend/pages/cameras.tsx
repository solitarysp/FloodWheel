import React, { useState, useEffect } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { Camera } from "../components/CameraCard";
import { CameraAnalysisModal, AnalysisResponse } from "../components/CameraAnalysisModal";
import { CameraHero } from "../components/camera/CameraHero";
import { CameraToolbar } from "../components/camera/CameraToolbar";
import { CameraMainContent } from "../components/camera/CameraMainContent";

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
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedCameraForAnalysis, setSelectedCameraForAnalysis] = useState<Camera | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        alert(`Completed AI scan for ${total} cameras. Detected ${flooded} flood points!`);
        await fetchCameras();
      } else {
        alert("Failed to run batch AI scan.");
      }
    } catch (err: any) {
      alert(`Batch scan error: ${err.message}`);
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
      fetchCameras();
    } catch (err: any) {
      alert(`Error analyzing camera snapshot: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const availableDistricts = React.useMemo(() => {
    const set = new Set<string>();
    cameras.forEach((c) => {
      if (c.location && c.location.trim().length > 0) set.add(c.location.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedDistrict !== "all") {
      const loc = cam.location.toLowerCase();
      const target = selectedDistrict.toLowerCase();
      if (loc !== target && !loc.includes(target)) return false;
    }
    return true;
  });

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
        <CameraHero cameras={cameras} />

        <CameraToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          availableDistricts={availableDistricts}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          isRefreshingAll={isRefreshingAll}
          onRefreshAll={handleRefreshAll}
        />

        <CameraMainContent
          loading={loading}
          viewMode={viewMode}
          filteredCameras={filteredCameras}
          cacheBuster={cacheBuster}
          analyzingId={analyzingId}
          isBatchAnalyzing={isBatchAnalyzing}
          onAnalyze={handleAnalyze}
          onBatchAnalyze={handleBatchAnalyze}
          onResetFilters={() => {
            setSearchQuery("");
            setSelectedDistrict("all");
          }}
          CameraMapComponent={CameraMap}
        />
      </main>

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
    </div>
  );
}
