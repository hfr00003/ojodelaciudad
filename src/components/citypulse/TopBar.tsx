import { Activity, AlertTriangle, Radio } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  activeCount: number;
  lastUpdate: Date;
  onOpenCamera: () => void;
}

export function TopBar({ activeCount, lastUpdate, onOpenCamera }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d: Date | null) =>
    d ? d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";

  return (
    <header className="h-14 shrink-0 border-b border-panel-border bg-panel/95 backdrop-blur flex items-center px-4 gap-6 relative z-20">
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
          <Radio className="w-5 h-5 text-primary" />
          <span className="absolute inset-0 rounded-md animate-pulse-glow text-primary" style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight leading-none">
            CityPulse <span className="text-primary">Jaén</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            Centro de Control Urbano
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-success/10 border border-success/30">
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
          <span className="relative w-2 h-2 rounded-full bg-success" />
        </span>
        <span className="text-xs font-medium text-success">Sistema Online</span>
      </div>

      <button 
        onClick={onOpenCamera}
        className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
      >
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium text-foreground">Abrir CCTV IA</span>
        <span className="mx-2 opacity-40">|</span>
        <span>Detectando vehículos en vivo</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-danger/10 border border-danger/30">
          <AlertTriangle className="w-3.5 h-3.5 text-danger" />
          <span className="text-xs font-medium text-danger">{activeCount} activas</span>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono tabular-nums">{fmt(now)}</div>
          <div className="text-[10px] text-muted-foreground">Últ. act. {fmt(lastUpdate)}</div>
        </div>
      </div>
    </header>
  );
}
