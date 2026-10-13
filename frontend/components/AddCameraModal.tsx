import React, { useState } from "react";
import { X, Camera } from "lucide-react";
import { CAMERA_PRESETS, DistrictPresetKey } from "./camera/AddCameraPresets";
import { AddCameraFormFields } from "./camera/AddCameraFormFields";

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded?: () => void;
  onSuccess?: () => void;
}

export const AddCameraModal: React.FC<AddCameraModalProps> = ({
  isOpen,
  onClose,
  onCameraAdded,
  onSuccess,
}) => {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("10.7725");
  const [longitude, setLongitude] = useState("106.6985");
  const [cameraAngle, setCameraAngle] = useState("elevated");
  const [streamUrl, setStreamUrl] = useState("");
  const [zoneId, setZoneId] = useState("zone-le-loi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreFill = (district: DistrictPresetKey) => {
    const randId = Math.floor(Math.random() * 900 + 100);
    const preset = CAMERA_PRESETS[district](randId);
    setId(preset.id);
    setName(preset.name);
    setLocation(preset.location);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setCameraAngle(preset.cameraAngle);
    setStreamUrl(preset.streamUrl);
    setZoneId(preset.zoneId);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/api/v1/cameras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          location,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          camera_angle: cameraAngle,
          stream_url: streamUrl,
          zone_id: zoneId && zoneId.trim() ? zoneId.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error: ${res.status}`);
      }

      if (onCameraAdded) onCameraAdded();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to register camera");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add Public Traffic Camera</h2>
              <p className="text-xs text-slate-500">Register new CCTV feed for VLRDR flood monitoring</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-500 font-semibold mb-1 block">Quick Templates</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePreFill("d1")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                District 1
              </button>
              <button
                type="button"
                onClick={() => handlePreFill("binhthanh")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                Binh Thanh
              </button>
              <button
                type="button"
                onClick={() => handlePreFill("thuduc")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                Thu Duc City
              </button>
            </div>
          </div>

          <AddCameraFormFields
            id={id}
            setId={setId}
            name={name}
            setName={setName}
            location={location}
            setLocation={setLocation}
            latitude={latitude}
            setLatitude={setLatitude}
            longitude={longitude}
            setLongitude={setLongitude}
            cameraAngle={cameraAngle}
            setCameraAngle={setCameraAngle}
            streamUrl={streamUrl}
            setStreamUrl={setStreamUrl}
            zoneId={zoneId}
            setZoneId={setZoneId}
            error={error}
            isSubmitting={isSubmitting}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
};
