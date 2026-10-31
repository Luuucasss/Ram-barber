import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Kpis } from "./layout";

export function KpiStrip({ kpis, currency }: { kpis: Kpis; currency: string }) {
  const items = [
    { label: "Turnos", value: String(kpis.total), hint: kpis.pending ? `${kpis.pending} por atender` : "sin pendientes" },
    { label: "Completados", value: String(kpis.completed), tone: kpis.completed ? "text-ok" : undefined },
    { label: "No vinieron", value: String(kpis.noShows), tone: kpis.noShows ? "text-warn" : undefined },
    {
      label: "Ingresos est.",
      value: formatPrice(kpis.revenue, currency),
      hint: "sin cancelados ni ausentes",
    },
    {
      label: "Ocupación",
      value: kpis.occupancy === null ? "—" : `${kpis.occupancy}%`,
      bar: kpis.occupancy,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-5">
      {items.map((k, i) => (
        <div key={k.label} className={cn("bg-card px-4 py-3", i === 0 && "col-span-2 sm:col-span-1")}>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-faint">{k.label}</dt>
          <dd className={cn("mt-1 text-2xl font-semibold tabular-nums leading-none", k.tone)}>{k.value}</dd>
          {k.hint && <dd className="mt-1.5 text-xs text-faint">{k.hint}</dd>}
          {k.bar !== undefined && (
            <dd className="mt-2.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ transform: `scaleX(${(k.bar ?? 0) / 100})` }}
              />
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
