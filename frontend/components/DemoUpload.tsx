import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { AnalysisResponseData } from "./ResultCard";

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
  const [locationHint, setLocationHint] = useState<string>("Đường Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        setErrorMessage(`File ${file.name} không phải ảnh hợp lệ (chỉ nhận JPG, PNG, WebP)`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} vượt quá dung lượng 10MB`);
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
      setErrorMessage("Vui lòng chọn ít nhất 1 ảnh để phân tích.");
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
      setErrorMessage(err.message || "Không thể kết nối đến AI Backend. Hãy đảm bảo backend đang chạy.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSamplePreset = async () => {
    // Generate a placeholder realistic sample image on canvas for instant offline demo
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Rainy road background
      const grad = ctx.createLinearGradient(0, 0, 0, 480);
      grad.addColorStop(0, "#334155");
      grad.addColorStop(0.5, "#475569");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Water flood surface
      ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
      ctx.fillRect(0, 260, 640, 220);

      // Sidewalk curb
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(0, 240, 640, 20);

      // Water ripples
      ctx.strokeStyle = "rgba(226, 232, 240, 0.4)";
      ctx.lineWidth = 2;
      for (let y = 280; y < 480; y += 30) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(600, y);
        ctx.stroke();
      }

      // Title on frame
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("CCTV: Nguyen Huu Canh - Binh Thanh (Sample Frame)", 30, 50);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("Landmarks: Honda Wave submerged to exhaust level (~35cm)", 30, 80);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], "cctv_nguyen_huu_canh_flood.png", { type: "image/png" });
          setSelectedFiles([sampleFile]);
          setPreviews([URL.createObjectURL(sampleFile)]);
          setLocationHint("Đường Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM");
        }
      }, "image/png");
    }
  };

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
                Kéo thả ảnh camera CCTV vào đây, hoặc <span className="text-blue-600 underline">chọn tệp</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ JPG, PNG, WebP tối đa 5 ảnh (mỗi ảnh ≤ 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Selected Previews */}
        {previews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Đã chọn {previews.length} ảnh:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                }}
                className="text-rose-600 hover:underline"
              >
                Xóa tất cả
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
              Góc đặt Camera (Camera Angle)
            </label>
            <select
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="elevated">Elevated (Cột đèn / đèn tín hiệu cao 4–6m - Mặc định)</option>
              <option value="street_level">Street Level (Ngang tầm mắt người / 1.5–2.5m)</option>
              <option value="overhead">Overhead (Cầu vượt bộ hành / tòa nhà cao &gt;8m)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên vị trí / Tuyến đường (Gợi ý ngữ cảnh)
            </label>
            <input
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="VD: Đường Nguyễn Hữu Cảnh, TP.HCM"
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
          <button
            type="button"
            onClick={loadSamplePreset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Nạp ảnh mẫu (Demo Quick Load)</span>
          </button>

          <button
            type="submit"
            disabled={isLoading || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI đang quét mốc thước đo...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Phân tích độ sâu ngập (Gemini VLRDR)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
