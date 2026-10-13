import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { AnalysisResponseData } from "./ResultCard";
import { BENCHMARK_ITEMS, BenchmarkItem } from "@/data/benchmarkDataset";
import { BenchmarkGalleryModal } from "./demo/BenchmarkGalleryModal";
import { createBenchmarkImageFile } from "./demo/benchmarkHelper";
import { UploadDropzone } from "./demo/UploadDropzone";
import { DemoUploadActions } from "./demo/DemoUploadActions";

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
    const file = await createBenchmarkImageFile(item);
    setSelectedFiles([file]);
    setPreviews([URL.createObjectURL(file)]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <UploadDropzone
          onFileChange={handleFileChange}
          previews={previews}
          onClearPreviews={() => {
            setSelectedFiles([]);
            setPreviews([]);
          }}
        />

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

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DemoUploadActions
          isLoading={isLoading}
          hasSelectedFiles={selectedFiles.length > 0}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onLoadPreset={() => selectBenchmarkImage(BENCHMARK_ITEMS[0])}
        />
      </form>

      <BenchmarkGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectImage={selectBenchmarkImage}
      />
    </div>
  );
};
