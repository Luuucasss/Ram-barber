import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Kpis } from "./layout";

/**
 * Day KPIs. Phones get a compact 2-row layout (turnos hero across the top, the rest in a 2×2 grid,
 * secondary hints dropped) so the bookings list stays above the fold; from sm up it is a 5-up strip.
 */
export function KpiStrip({ kpis, currency }: { kpis: Kpis; currency: string }) {
  const items = [
    { label: "Turnos", value: String(kpis.total), hint: kpis.pending ? `${kpis.pending} por atender` : "sin pendientes" },
    // Monochrome: zero values recede, non-zero ones read in full ink.
    { label: "Completados", value: String(kpis.completed), tone: kpis.completed ? "text-ink" : "text-faint" },
    { label: "No vinieron", value: String(kpis.noShows), tone: kpis.noShows ? "text-ink" : "text-faint" },
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
        <div
          key={k.label}
          className={cn(
            "min-w-0 bg-card px-3.5 py-2.5 sm:px-4 sm:py-3",
            i === 0 && "col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:block",
          )}
        >
          <div className="min-w-0">
            <dt className="truncate text-[10px] uppercase tracking-[0.12em] text-faint sm:text-[11px] sm:tracking-[0.16em]">
              {k.label}
            </dt>
            <dd
              className={cn(
                "mt-1 truncate text-xl font-semibold tabular-nums leading-none sm:text-2xl",
                k.tone,
              )}
            >
              {k.value}
            </dd>
          </div>
          {k.hint && (
            <dd
              className={cn(
                "text-xs text-faint sm:mt-1.5",
                i === 0 ? "shrink-0 rounded-full border border-line px-2.5 py-1 sm:border-0 sm:p-0" : "hidden sm:block",
              )}
            >
              {k.hint}
            </dd>
          )}
          {k.bar !== undefined && (
            <dd className="mt-2 h-1 overflow-hidden rounded-full bg-line sm:mt-2.5" aria-hidden="true">
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
