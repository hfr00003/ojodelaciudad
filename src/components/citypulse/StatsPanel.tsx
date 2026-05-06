import { Incident } from "@/lib/incident-simulator";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";

interface Props {
  incidents: Incident[];
}

export function StatsPanel({ incidents }: Props) {
  const data = useMemo(() => {
    const buckets: { t: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const start = now - (i + 1) * 60 * 1000;
      const end = now - i * 60 * 1000;
      const count = incidents.filter((x) => {
        const t = x.time.getTime();
        return t >= start && t < end;
      }).length;
      const d = new Date(end);
      buckets.push({
        t: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        count,
      });
    }
    return buckets;
  }, [incidents]);

  const counts = {
    accident: incidents.filter((i) => i.type === "accident").length,
    anomaly: incidents.filter((i) => i.type === "anomaly").length,
    normal: incidents.filter((i) => i.type === "normal").length,
  };

  return (
    <div className="border-t border-panel-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider">Actividad · 12 min</h2>
        <span className="text-[10px] font-mono text-muted-foreground">tiempo real</span>
      </div>

      <div className="h-24 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--panel-border)",
                fontSize: 11,
                borderRadius: 6,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat color="danger" label="Accidentes" value={counts.accident} />
        <Stat color="warning" label="Anomalías" value={counts.anomaly} />
        <Stat color="success" label="Normales" value={counts.normal} />
      </div>
    </div>
  );
}

function Stat({ color, label, value }: { color: "danger" | "warning" | "success"; label: string; value: number }) {
  const cls = {
    danger: "text-danger border-danger/30 bg-danger/5",
    warning: "text-warning border-warning/30 bg-warning/5",
    success: "text-success border-success/30 bg-success/5",
  }[color];
  return (
    <div className={`rounded-md border p-2 ${cls}`}>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
