import React, { useState } from "react";
import { X, Camera, PlusCircle, CheckCircle, AlertCircle, Link as LinkIcon } from "lucide-react";

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: () => void;
}

export const AddCameraModal: React.FC<AddCameraModalProps> = ({
  isOpen,
  onClose,
  onCameraAdded,
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

  const handlePreFill = (district: "d1" | "binhthanh" | "thuduc") => {
    if (district === "d1") {
      setId(`cam-custom-${Math.floor(Math.random() * 900 + 100)}`);
      setName("TTH 398: Le Loi - Phan Boi Chau (Ben Thanh)");
      setLocation("Le Loi & Phan Boi Chau, Ben Thanh, District 1");
      setLatitude("10.7723");
      setLongitude("106.6989");
      setCameraAngle("overhead");
      setStreamUrl("https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=662b85031afb9c00172dd0dc&bg=black&w=640&h=360");
      setZoneId("zone-le-loi");
    } else if (district === "binhthanh") {
      setId(`cam-custom-${Math.floor(Math.random() * 900 + 100)}`);
      setName("TTH 233.1: Nguyen Huu Canh - Ngo Tat To");
      setLocation("Nguyen Huu Canh, Ward 22, Binh Thanh");
      setLatitude("10.7891");
      setLongitude("106.7164");
      setCameraAngle("elevated");
      setStreamUrl("https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=63b65ebebfd3d90017eaa3ae&bg=black&w=640&h=360");
      setZoneId("zone-nguyen-huu-canh");
    } else {
      setId(`cam-custom-${Math.floor(Math.random() * 900 + 100)}`);
      setName("TTH 146: Vo Van Ngan - Dang Van Bi Junction");
      setLocation("Vo Van Ngan, Truong Tho, Thu Duc City");
      setLatitude("10.8511");
      setLongitude("106.7580");
      setCameraAngle("street_level");
      setStreamUrl("https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=5d8cd542766c880017188948&bg=black&w=640&h=360");
      setZoneId("zone-vo-van-ngan");
    }
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

      onCameraAdded();
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
          {/* Quick Preset Buttons */}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Camera ID</label>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="cam-custom-01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Camera Angle</label>
              <select
                value={cameraAngle}
                onChange={(e) => setCameraAngle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="elevated">Elevated Pole (~5m)</option>
                <option value="street_level">Street Level (~2m)</option>
                <option value="overhead">Overhead (>8m)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold mb-1 block">Camera Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CCTV 088: Nguyen Hue Boulevard"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold mb-1 block">Street Location</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nguyen Hue & Ton Duc Thang, District 1"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold mb-1 block">Stream / Snapshot URL</label>
            <div className="relative">
              <input
                type="url"
                required
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=662b86c41afb9c00172dd31c&bg=black&w=640&h=360"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold mb-1 block">Associated Flood Zone</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Unassigned (No Zone)</option>
              <option value="zone-nguyen-huu-canh">Nguyen Huu Canh Corridor (Binh Thanh)</option>
              <option value="zone-vo-van-ngan">Vo Van Ngan Incline (Thu Duc City)</option>
              <option value="zone-quoc-huong">Quoc Huong Street (Thu Duc City)</option>
              <option value="zone-le-loi">Le Loi Boulevard (District 1)</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm shadow-blue-500/20 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Add Camera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
