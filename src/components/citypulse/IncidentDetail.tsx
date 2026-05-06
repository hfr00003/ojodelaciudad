import { Incident, TYPE_ACTION, TYPE_LABEL } from "@/lib/incident-simulator";
import { Camera, MapPin, Sparkles, X, Siren, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  incident: Incident | null;
  onClose: () => void;
  onResolve: (id: string) => void;
}

export function IncidentDetail({ incident, onClose, onResolve }: Props) {
  if (!incident) return null;

  const accent =
    incident.type === "accident" ? "text-danger border-danger/40 bg-danger/10" :
    incident.type === "anomaly" ? "text-warning border-warning/40 bg-warning/10" :
    "text-success border-success/40 bg-success/10";

  return (
    <div className="absolute right-4 bottom-4 w-[340px] rounded-lg border border-panel-border bg-panel/95 backdrop-blur shadow-2xl animate-slide-in z-[1000]">
      <div className="flex items-start justify-between p-4 border-b border-panel-border">
        <div>
          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border", accent)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {TYPE_LABEL[incident.type]}
          </div>
          <h3 className="mt-2 text-sm font-semibold">{incident.street}</h3>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">ID {incident.id}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hora detección</div>
            <div className="font-mono">{incident.time.toLocaleTimeString("es-ES")}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estado</div>
            <div className={cn("font-medium", incident.status === "active" ? "text-danger" : "text-success")}>
              {incident.status === "active" ? "● Activo" : "✓ Resuelto"}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono">{incident.camera}</span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${incident.lat},${incident.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
            title="Abrir en Google Maps"
          >
            <MapPin className="w-3 h-3" />
            <span className="font-mono">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div className="rounded-md border border-panel-border bg-background/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" /> Confianza IA
            </span>
            <span className="text-sm font-bold tabular-nums">{incident.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success transition-all"
              style={{ width: `${incident.confidence}%` }}
            />
          </div>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-primary mb-1">Acción sugerida</div>
          <div className="text-xs">{TYPE_ACTION[incident.type]}</div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1.5 h-8 text-xs rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <MapPin className="w-3 h-3" /> Abrir ubicación en Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>

        {incident.status === "active" && (
          <div className="flex gap-2 pt-1">
            {incident.type === "accident" && (
              <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs">
                <Siren className="w-3 h-3" /> Avisar 112
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-8 text-xs"
              onClick={() => onResolve(incident.id)}
            >
              <CheckCircle2 className="w-3 h-3" /> Marcar resuelto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
