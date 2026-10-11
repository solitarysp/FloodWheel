import React, { useState } from "react";
import { MapPin, AlertCircle, ShieldAlert, CheckCircle2, Sliders, ExternalLink } from "lucide-react";

export interface GeoFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[];
  };
  properties: {
    zone_id: string;
    name: string;
    district: string;
    city: string;
    depth_level: number;
    depth_cm_min: number;
    depth_cm_max: number;
    color: string;
    is_overridden: boolean;
    center: [number, number];
    last_updated: string | null;
  };
}

export interface GeoJsonData {
  type: string;
  features: GeoFeature[];
}

interface FloodMapProps {
  geoJson: GeoJsonData | null;
  onSelectZone: (zoneId: string) => void;
  selectedZoneId: string | null;
}

export const FloodMap: React.FC<FloodMapProps> = ({
  geoJson,
  onSelectZone,
  selectedZoneId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const features = geoJson?.features || [];

  return (
    <div className="relative w-full h-[580px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl select-none">
      {/* Map Control Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/60 text-xs text-white shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold tracking-wide">Real-time Urban Flood Map — Ho Chi Minh City</span>
      </div>

      {/* Map Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-lg text-white">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-sm"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-sm"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs"
          title="Reset View"
        >
          ↺
        </button>
      </div>

      {/* SVG Canvas Map Projection */}
      <div className="w-full h-full flex items-center justify-center p-6 overflow-hidden">
        <svg
          viewBox="0 0 900 600"
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* River / Waterways Background (Saigon River Path) */}
          <path
            d="M 120 50 Q 250 150 400 200 T 550 350 T 750 450 T 880 580"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="38"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M 120 50 Q 250 150 400 200 T 550 350 T 750 450 T 880 580"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* Road Network Grid Lines */}
          <g stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4">
            <line x1="100" y1="180" x2="800" y2="180" />
            <line x1="80" y1="320" x2="820" y2="320" />
            <line x1="150" y1="460" x2="780" y2="460" />
            <line x1="280" y1="80" x2="280" y2="520" />
            <line x1="520" y1="60" x2="520" y2="540" />
            <line x1="700" y1="100" x2="700" y2="500" />
          </g>

          {/* District Labels */}
          <text x="240" y="380" fill="#64748b" fontSize="13" fontWeight="bold">DISTRICT 1</text>
          <text x="440" y="240" fill="#64748b" fontSize="13" fontWeight="bold">BINH THANH</text>
          <text x="650" y="210" fill="#64748b" fontSize="13" fontWeight="bold">THU DUC CITY</text>

          {/* Flood Zones Polygons & Nodes */}
          {features.map((feat, idx) => {
            const props = feat.properties;
            const zoneId = props.zone_id || feat.id;
            const isSelected = selectedZoneId === zoneId;

            // Map GPS coords to SVG canvas viewport safely
            const center = Array.isArray(props.center) ? props.center : [106.7009, 10.7769];
            const x = Math.max(40, Math.min(860, 180 + ((center[0] - 106.69) / 0.08) * 580));
            const y = Math.max(40, Math.min(560, 480 - ((center[1] - 10.76) / 0.10) * 440));

            const radius = 28 + ((props.depth_level || 0) * 6);

            return (
              <g
                key={feat.id || idx}
                onClick={() => zoneId && onSelectZone(zoneId)}
                className="cursor-pointer transition-transform group"
              >
                {/* Heatmap Pulsing Aura */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius * 1.5}
                  fill={props.color}
                  opacity={isSelected ? 0.45 : 0.25}
                  className={props.depth_level >= 3 ? "animate-pulse" : ""}
                />

                {/* Main Zone Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={props.color}
                  opacity={0.8}
                  stroke={isSelected ? "#ffffff" : props.color}
                  strokeWidth={isSelected ? 3.5 : 2}
                  className="group-hover:scale-110 transition-transform origin-center"
                />

                {/* Level Badge Text */}
                <text
                  x={x}
                  y={y - 2}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  L{props.depth_level}
                </text>
                <text
                  x={x}
                  y={y + 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="600"
                >
                  {props.depth_cm_max > 0 ? `${props.depth_cm_max}cm` : "Dry"}
                </text>

                {/* Zone Label Tooltip */}
                <g transform={`translate(${x}, ${y - radius - 14})`}>
                  <rect
                    x="-75"
                    y="-16"
                    width="150"
                    height="22"
                    rx="6"
                    fill="#0f172a"
                    stroke={isSelected ? "#38bdf8" : "#334155"}
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {props.name.length > 22 ? props.name.substring(0, 20) + "..." : props.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">VLRDR Depth Scale:</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
              L0 (0cm)
            </span>
            <span className="px-2 py-0.5 rounded bg-lime-500/20 text-lime-300 font-bold border border-lime-500/40">
              L1 (10cm)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              L2 (20cm)
            </span>
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40">
              L3 (35cm)
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40">
              L4 (50cm)
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
              L5 (&gt;70cm)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>* Click any zone node to view telemetry & manual override controls</span>
        </div>
      </div>
    </div>
  );
};
