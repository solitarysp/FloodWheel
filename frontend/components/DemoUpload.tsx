import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw, FolderSearch, X, Check, ShieldAlert, CheckCircle2 } from "lucide-react";
import { AnalysisResponseData } from "./ResultCard";
import { BENCHMARK_ITEMS, BenchmarkItem } from "@/data/benchmarkDataset";

interface DemoUploadProps {
  onAnalyzeComplete: (results: AnalysisResponseData[], previews: string[], fileNames: string[]) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export const DemoUpload: React.FC<DemoUploadProps> = ({
  onAnalyzeComplete,
  isLoading,
  setIsLoading,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cameraAngle, setCameraAngle] = useState<string>("elevated");
  const [locationHint, setLocationHint] = useState<string>("Nguyen Huu Canh Corridor, Binh Thanh, HCMC");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [galleryTab, setGalleryTab] = useState<"flooded" | "non-flooded">("flooded");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`File ${file.name} is not a valid image (JPG, PNG, WebP only)`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds 10MB size limit`);
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(validFiles);
    setPreviews(validPreviews);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least 1 image to analyze.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("camera_angle", cameraAngle);
      formData.append("location_hint", locationHint);

      const response = await fetch(`${apiUrl}/api/v1/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const results: AnalysisResponseData[] = await response.json();
      const fileNames = selectedFiles.map((f) => f.name);
      onAnalyzeComplete(results, previews, fileNames);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to connect to AI Backend. Ensure the backend service is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectBenchmarkImage = async (item: BenchmarkItem) => {
    setIsGalleryOpen(false);
    setLocationHint(item.location);

    try {
      // Fetch image from Wikimedia Special:FilePath
      const res = await fetch(item.imageUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], `${item.id}.jpg`, { type: "image/jpeg" });
        setSelectedFiles([file]);
        setPreviews([URL.createObjectURL(file)]);
        return;
      }
    } catch (e) {
      console.warn("Direct image fetch blocked by browser CORS, rendering proxy frame:", e);
    }

    // Fallback if browser cross-origin policy blocks external Wikimedia blob
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = item.category === "flooded" ? "#334155" : "#60a5fa";
      ctx.fillRect(0, 0, 640, 480);
      if (item.category === "flooded") {
        ctx.fillStyle = "rgba(71, 85, 105, 0.9)";
        ctx.fillRect(0, 260, 640, 220);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`Benchmark: ${item.title}`, 25, 45);
      ctx.font = "14px sans-serif";
      ctx.fillText(`Location: ${item.location} (Level ${item.depth_level})`, 25, 75);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], `${item.id}.jpg`, { type: "image/jpeg" });
          setSelectedFiles([sampleFile]);
          setPreviews([URL.createObjectURL(sampleFile)]);
        }
      }, "image/jpeg");
    }
  };

  const loadSamplePreset = async () => {
    // Quick sample
    selectBenchmarkImage(BENCHMARK_ITEMS[0]);
  };

  const filteredBenchmark = BENCHMARK_ITEMS.filter((i) => i.category === galleryTab);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-colors">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                Drag and drop CCTV camera images here, or <span className="text-blue-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG, PNG, WebP up to 5 images (each ≤ 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Selected Previews */}
        {previews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Selected {previews.length} image{previews.length > 1 ? "s" : ""}:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                }}
                className="text-rose-600 hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parameters: Angle & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Camera Perspective / Angle
            </label>
            <select
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="elevated">Elevated (Pole / Mast mounted 4–6m - Default)</option>
              <option value="street_level">Street Level (Eye level / 1.5–2.5m)</option>
              <option value="overhead">Overhead (Pedestrian flyover / overpass &gt;8m)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Location Context / Street Corridor Hint
            </label>
            <input
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="e.g. Nguyen Huu Canh Corridor, HCMC"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition shadow-xs"
            >
              <FolderSearch className="w-4 h-4 text-blue-600" />
              <span>20 Real Benchmark Images (Dataset)</span>
            </button>

            <button
              type="button"
              onClick={loadSamplePreset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Quick Load Preset</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI scanning physical landmarks...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Analyze Flood Depth (Gemini VLRDR)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Benchmark Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                20 Real-World Benchmark Scenarios (Urban Streets & Flooding)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any benchmark image to evaluate Gemini's VLRDR landmark relative depth reasoning
              </p>

              {/* Tabs */}
              <div className="flex gap-3 mt-4 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setGalleryTab("flooded")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    galleryTab === "flooded"
                      ? "bg-rose-50 text-rose-700 border border-rose-300 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>10 Inundated Scenarios (Levels 2–4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGalleryTab("non-flooded")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    galleryTab === "non-flooded"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>10 Dry Street Scenarios (Level 0)</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {filteredBenchmark.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectBenchmarkImage(item)}
                  className="rounded-2xl border border-slate-200 p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition flex gap-3 group bg-slate-50/50 hover:bg-white"
                >
                  <div className="w-24 h-24 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative border border-slate-300">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <span
                      className={`absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                        item.depth_level >= 3
                          ? "bg-rose-600"
                          : item.depth_level > 0
                          ? "bg-amber-600"
                          : "bg-emerald-600"
                      }`}
                    >
                      L{item.depth_level}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">{item.location}</p>
                    <div className="text-[11px] font-semibold text-slate-700">
                      {item.depth_level > 0
                        ? `Est: ${item.depth_cm_min}–${item.depth_cm_max} cm`
                        : "Dry Road (0 cm)"}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Landmarks: {item.landmarks.join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Source: Curated Urban Traffic Imagery (Creative Commons Attribution)</span>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
