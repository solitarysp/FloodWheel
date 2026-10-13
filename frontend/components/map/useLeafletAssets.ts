import { useEffect, useState } from "react";

export function useLeafletAssets() {
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadLeafletAssets = async () => {
      if (typeof window === "undefined") return;

      // Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // MarkerCluster Core CSS
      if (!document.getElementById("markercluster-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css";
        document.head.appendChild(link);
      }

      // MarkerCluster Default Theme CSS
      if (!document.getElementById("markercluster-default-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-default-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css";
        document.head.appendChild(link);
      }

      const loadScript = (src: string, id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const existing = document.getElementById(id) as HTMLScriptElement | null;
          if (existing) {
            if (existing.dataset.loaded === "true") {
              resolve();
              return;
            }
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", reject);
            setTimeout(() => resolve(), 300);
            return;
          }

          const script = document.createElement("script");
          script.id = id;
          script.src = src;
          script.async = false;
          script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      try {
        if (!(window as any).L) {
          await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet-js");
        }

        if ((window as any).L && typeof (window as any).L.markerClusterGroup !== "function") {
          await loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js",
            "markercluster-js"
          );
        }

        let retries = 0;
        while (retries < 25 && !(window as any).L?.markerClusterGroup) {
          await new Promise((r) => setTimeout(r, 60));
          retries++;
        }

        if (isMounted) {
          setIsMapReady(true);
        }
      } catch (err) {
        console.error("Failed to load Leaflet or MarkerCluster scripts:", err);
        if (isMounted && (window as any).L) {
          setIsMapReady(true);
        }
      }
    };

    loadLeafletAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isMapReady };
}
