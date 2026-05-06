import { lazy, Suspense, useEffect, useState } from "react";
import type { Incident } from "@/lib/incident-simulator";

const CityMapInner = lazy(() =>
  import("./CityMap").then((m) => ({ default: m.CityMap }))
);

interface Props {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CityMapClient(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 map-grid scanline flex items-center justify-center">
        <div className="text-xs font-mono text-muted-foreground animate-pulse">
          Inicializando mapa…
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 map-grid scanline flex items-center justify-center">
          <div className="text-xs font-mono text-muted-foreground animate-pulse">
            Cargando cartografía…
          </div>
        </div>
      }
    >
      <CityMapInner {...props} />
    </Suspense>
  );
}
