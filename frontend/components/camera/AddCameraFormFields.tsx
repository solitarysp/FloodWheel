import React from "react";
import { Link as LinkIcon, AlertCircle } from "lucide-react";
import { FLOOD_ZONES_OPTIONS } from "./AddCameraPresets";

interface AddCameraFormFieldsProps {
  id: string;
  setId: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  latitude: string;
  setLatitude: (v: string) => void;
  longitude: string;
  setLongitude: (v: string) => void;
  cameraAngle: string;
  setCameraAngle: (v: string) => void;
  streamUrl: string;
  setStreamUrl: (v: string) => void;
  zoneId: string;
  setZoneId: (v: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
}

export const AddCameraFormFields: React.FC<AddCameraFormFieldsProps> = ({
  id,
  setId,
  name,
  setName,
  location,
  setLocation,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  cameraAngle,
  setCameraAngle,
  streamUrl,
  setStreamUrl,
  zoneId,
  setZoneId,
  error,
  isSubmitting,
  onClose,
}) => {
  return (
    <>
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
            <option value="overhead">Overhead (&gt;8m)</option>
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
          {FLOOD_ZONES_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
    </>
  );
};
