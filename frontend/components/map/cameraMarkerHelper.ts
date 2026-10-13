import { Camera } from "../CameraCard";

export function createCameraMarker(L: any, cam: Camera, onSelect: (c: Camera) => void) {
  const isOnline = cam.status.toUpperCase() === "ONLINE";
  const reading = cam.latest_reading;
  const isFlooded = !!reading && ((reading.depth_level || 0) >= 1 || reading.flood_detected);

  let pinModifier = "flood-unanalyzed";
  let badgeLabel = "Chưa quét";
  let iconColor = "text-blue-400";

  if (reading) {
    const lvl = reading.depth_level ?? 0;
    if (lvl === 0) {
      pinModifier = "flood-level-0";
      badgeLabel = "0cm";
      iconColor = "text-emerald-400";
    } else if (lvl <= 2) {
      pinModifier = "flood-level-2";
      badgeLabel = `${reading.depth_estimate_cm_max || 20}cm`;
      iconColor = "text-amber-400";
    } else if (lvl === 3) {
      pinModifier = "flood-level-3";
      badgeLabel = `${reading.depth_estimate_cm_max || 40}cm`;
      iconColor = "text-orange-400";
    } else {
      pinModifier = "flood-level-4";
      badgeLabel = `🚨 ${reading.depth_estimate_cm_max || 60}cm`;
      iconColor = "text-rose-400";
    }
  } else if (!isOnline) {
    pinModifier += " offline";
  }

  const pinHtml = `
    <div class="relative flex flex-col items-center">
      <div class="cam-marker-pin ${pinModifier}">
        <svg class="w-3.5 h-3.5 ${iconColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      </div>
      <span class="absolute -bottom-2 bg-slate-900/95 text-white border border-slate-700/80 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono tracking-tighter whitespace-nowrap shadow-md">
        ${badgeLabel}
      </span>
    </div>
  `;

  const icon = L.divIcon({
    html: pinHtml,
    className: "",
    iconSize: [40, 44],
    iconAnchor: [20, 22],
    popupAnchor: [0, -22],
  });

  const marker = L.marker([cam.latitude, cam.longitude], {
    icon,
    isFlooded,
  } as any);

  marker.on("click", () => {
    onSelect(cam);
  });

  return marker;
}
