import { Incident, TYPE_LABEL } from "@/lib/incident-simulator";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, CheckCircle2, MapPin } from "lucide-react";

interface Props {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: "all" | "accident" | "anomaly";
  onFilterChange: (f: "all" | "accident" | "anomaly") => void;
}

const ICON = {
  accident: AlertTriangle,
  anomaly: AlertCircle,
  normal: CheckCircle2,
};

const COLOR = {
  accident: "text-danger",
  anomaly: "text-warning",
  normal: "text-success",
};

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  return `hace ${Math.floor(m / 60)}h`;
}

export function IncidentList({ incidents, selectedId, onSelect, filter, onFilterChange }: Props) {
  const filtered = incidents.filter((i) => filter === "all" || i.type === filter);

  const filters: { id: typeof filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "accident", label: "Accidentes" },
    { id: "anomaly", label: "Anomalías" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-panel-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider">Incidencias en vivo</h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {filtered.length} eventos
          </span>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "flex-1 text-[10px] uppercase tracking-wider py-1 rounded border transition-colors",
                filter === f.id
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-panel-border text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Sin eventos para este filtro.
          </div>
        )}
        {filtered.map((inc) => {
          const Icon = ICON[inc.type];
          const isSel = inc.id === selectedId;
          return (
            <div
              key={inc.id}
              className={cn(
                "w-full px-4 py-3 border-b border-panel-border/60 flex gap-3 items-start hover:bg-accent/40 transition-colors animate-slide-in",
                isSel && "bg-primary/10 border-l-2 border-l-primary"
              )}
            >
              <button
                onClick={() => onSelect(inc.id)}
                className="flex-1 flex gap-3 items-start text-left min-w-0"
              >
                <div className={cn("mt-0.5 shrink-0", COLOR[inc.type])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate">{TYPE_LABEL[inc.type]}</span>
                    {inc.status === "active" ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/15 text-danger font-medium uppercase tracking-wider">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium uppercase tracking-wider">
                        Resuelto
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{inc.street}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground/80">
                    <span>{inc.time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>·</span>
                    <span>{timeAgo(inc.time)}</span>
                    <span>·</span>
                    <span className="text-primary">{inc.confidence}%</span>
                  </div>
                </div>
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${inc.lat},${inc.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Abrir en Google Maps"
              >
                <MapPin className="w-3.5 h-3.5" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
