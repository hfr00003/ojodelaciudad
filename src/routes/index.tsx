import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { TopBar } from "@/components/citypulse/TopBar";
import { CityMapClient as CityMap } from "@/components/citypulse/CityMapClient";
import { IncidentList } from "@/components/citypulse/IncidentList";
import { IncidentDetail } from "@/components/citypulse/IncidentDetail";
import { StatsPanel } from "@/components/citypulse/StatsPanel";
import { Incident, randomIncident, seedIncidents, TYPE_LABEL } from "@/lib/incident-simulator";
import { AlertTriangle, Video } from "lucide-react";
import { AICameraFeed } from "@/components/citypulse/AICameraFeed";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "CityPulse Jaén · Centro de Control Urbano" },
      {
        name: "description",
        content:
          "Plataforma de ciudad inteligente para Jaén: detección de incidentes de tráfico en tiempo real y monitorización urbana con IA.",
      },
    ],
  }),
});

function Index() {
  const [incidents, setIncidents] = useState<Incident[]>(() => seedIncidents(6));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "accident" | "anomaly">("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  // Real-time simulation: spawn new incidents every 5–10s
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 5000 + Math.random() * 5000;
      timeoutId = setTimeout(() => {
        const inc = randomIncident();
        setIncidents((prev) => [inc, ...prev].slice(0, 60));
        setLastUpdate(new Date());

        if (inc.type === "accident") {
          toast.error(`🚨 Accidente detectado · ${inc.street}`, {
            description: `Confianza IA ${inc.confidence}% · ${inc.camera}`,
            action: {
              label: "Ver",
              onClick: () => setSelectedId(inc.id),
            },
          });
        } else if (inc.type === "anomaly") {
          toast(`⚠️ Anomalía · ${inc.street}`, {
            description: `${TYPE_LABEL[inc.type]} · ${inc.camera}`,
          });
        }

        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  // Auto-resolve old active incidents occasionally
  useEffect(() => {
    const t = setInterval(() => {
      setIncidents((prev) =>
        prev.map((i) => {
          if (i.status === "active" && Date.now() - i.time.getTime() > 45_000 && Math.random() < 0.4) {
            return { ...i, status: "resolved" };
          }
          return i;
        })
      );
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const selected = incidents.find((i) => i.id === selectedId) ?? null;
  const activeCount = incidents.filter((i) => i.status === "active" && i.type !== "normal").length;

  const handleResolve = (id: string) => {
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: "resolved" } : i)));
    toast.success("Incidencia marcada como resuelta");
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <TopBar activeCount={activeCount} lastUpdate={lastUpdate} onOpenCamera={() => setShowCamera(true)} />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-[340px] shrink-0 border-r border-panel-border bg-panel/60 backdrop-blur flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
            <IncidentList
              incidents={incidents}
              selectedId={selectedId}
              onSelect={setSelectedId}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
          <StatsPanel incidents={incidents} />
        </aside>

        {/* Map area */}
        <main className="relative flex-1 min-w-0">
          <CityMap incidents={incidents} selectedId={selectedId} onSelect={setSelectedId} />



          {/* Legend */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 px-3 py-2 rounded-md bg-panel/80 border border-panel-border backdrop-blur text-[11px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Leyenda</div>
            <LegendItem color="bg-danger" label="Accidente" />
            <LegendItem color="bg-warning" label="Anomalía" />
            <LegendItem color="bg-success" label="Normal" />
          </div>

          {activeCount > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/15 border border-danger/40 backdrop-blur">
              <AlertTriangle className="w-3.5 h-3.5 text-danger animate-blink" />
              <span className="text-xs text-danger font-medium">
                {activeCount} {activeCount === 1 ? "incidente activo" : "incidentes activos"} requieren atención
              </span>
            </div>
          )}

          <IncidentDetail incident={selected} onClose={() => setSelectedId(null)} onResolve={handleResolve} />

          {/* Renderizar Cámara de IA cuando está activa */}
          {showCamera && <AICameraFeed onClose={() => setShowCamera(false)} />}
        </main>
      </div>

      <Toaster theme="light" position="bottom-right" toastOptions={{ style: { background: "var(--panel)", border: "1px solid var(--panel-border)", color: "var(--foreground)" } }} />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
