import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Incident, JAEN_CENTER } from "@/lib/incident-simulator";

interface Props {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const COLOR: Record<Incident["type"], string> = {
  accident: "#ef4444",
  anomaly: "#f59e0b",
  normal: "#22c55e",
};

function FlyToSelected({ incidents, selectedId }: { incidents: Incident[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (inc) map.flyTo([inc.lat, inc.lng], 16, { duration: 0.8 });
  }, [selectedId, incidents, map]);
  return null;
}

// Pulsing radar overlay drawn on top of Leaflet for active incidents
function RadarLayer({ incidents, selectedId, onSelect }: Props) {
  const map = useMap();
  const [, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    map.on("move zoom moveend zoomend", update);
    return () => {
      map.off("move zoom moveend zoomend", update);
    };
  }, [map]);

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none z-[450]">
      {incidents.map((inc) => {
        if (inc.status !== "active" || inc.type === "normal") return null;
        const p = map.latLngToContainerPoint(L.latLng(inc.lat, inc.lng));
        const isSelected = selectedId === inc.id;
        return (
          <button
            key={inc.id}
            onClick={() => onSelect(inc.id)}
            style={{ left: p.x, top: p.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            aria-label={`Incidente ${inc.street}`}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 animate-radar"
              style={{ borderColor: COLOR[inc.type] }}
            />
            {isSelected && (
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2"
                style={{ borderColor: COLOR[inc.type] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CityMap({ incidents, selectedId, onSelect }: Props) {
  return (
    <div className="relative w-full h-full overflow-hidden scanline citypulse-map">
      <MapContainer
        center={JAEN_CENTER}
        zoom={15}
        scrollWheelZoom
        zoomControl={false}
        className="absolute inset-0 w-full h-full"
        style={{ background: "oklch(0.16 0.025 252)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
        />

        {incidents.map((inc) => (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={selectedId === inc.id ? 10 : 7}
            pathOptions={{
              color: COLOR[inc.type],
              fillColor: COLOR[inc.type],
              fillOpacity: inc.status === "resolved" ? 0.25 : 0.85,
              weight: 2,
              opacity: inc.status === "resolved" ? 0.4 : 1,
            }}
            eventHandlers={{ click: () => onSelect(inc.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs">
                <div className="font-semibold">{inc.street}</div>
                <div className="opacity-80">{inc.camera} · {inc.confidence}%</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        <FlyToSelected incidents={incidents} selectedId={selectedId} />
        <RadarLayer incidents={incidents} selectedId={selectedId} onSelect={onSelect} />
      </MapContainer>

      {/* City label */}
      <div className="absolute bottom-4 left-4 z-[500] px-3 py-1.5 rounded-md bg-panel/80 border border-panel-border backdrop-blur pointer-events-none">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sector</div>
        <div className="text-sm font-mono">JAÉN · Centro</div>
      </div>
    </div>
  );
}
