import React, { useRef } from "react";
import { UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFileChange: (files: FileList | null) => void;
  previews: string[];
  onClearPreviews: () => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileChange,
  previews,
  onClearPreviews,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFileChange(e.dataTransfer.files);
  };

  return (
    <>
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
          onChange={(e) => onFileChange(e.target.files)}
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

      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Selected {previews.length} image{previews.length > 1 ? "s" : ""}:</span>
            <button
              type="button"
              onClick={onClearPreviews}
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
    </>
  );
};
