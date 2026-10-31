"use client";

import { BadgeCheck, CalendarOff, ChevronRight, StickyNote } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toHHMM, toMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/admin/bookings/StatusPill";
import type { AdminBooking, AgendaBarber, AgendaTimeOff } from "@/components/admin/bookings/types";
import { rangesFor, timeOffsFor } from "./layout";
import { STRIPES } from "./TimeGrid";

export type ListMode = "barber" | "time";

/** Phone layout of the agenda: one card per booking, grouped by barber or as a single timeline. */
export function AgendaList({
  mode,
  date,
  barbers,
  bookings,
  timeOffs,
  nowMin,
  currency,
  onSelect,
}: {
  mode: ListMode;
  date: string;
  barbers: AgendaBarber[];
  bookings: AdminBooking[];
  timeOffs: AgendaTimeOff[];
  nowMin: number | null;
  currency: string;
  onSelect: (b: AdminBooking) => void;
}) {
  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start) || a.barberName.localeCompare(b.barberName));

  if (mode === "time") {
    return (
      <ul className="flex flex-col gap-2">
        {sorted.map((b, i) => (
          <li key={b._id}>
            <NowDivider show={nowMin !== null && isFirstAfter(sorted, i, nowMin)} />
            <Row b={b} currency={currency} onSelect={onSelect} showBarber />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {barbers.map((barber) => {
        const mine = sorted.filter((b) => b.barberId === barber._id);
        const offs = timeOffsFor(barber, timeOffs);
        const ranges = rangesFor(barber, date);
        if (!mine.length && !offs.length && !ranges.length) return null;
        return (
          <section key={barber._id} className="flex flex-col gap-2">
            <h3 className="flex items-baseline justify-between gap-2 px-1">
              <span className="font-semibold">{barber.name}</span>
              <span className="text-xs text-faint">
                {ranges.length
                  ? ranges.map(([s, e]) => `${toHHMM(s)}–${toHHMM(e)}`).join(" · ")
                  : "Sin horario"}
              </span>
            </h3>
            {offs.map((t) => (
              <div
                key={t._id}
                className="flex items-center gap-2 rounded-2xl border border-line px-4 py-2.5 text-sm text-dim"
                style={{ backgroundImage: STRIPES }}
              >
                <CalendarOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {t.allDay ? "Todo el día" : `${t.start}–${t.end}`} · {t.reason || "Bloqueado"}
                </span>
              </div>
            ))}
            {mine.length ? (
              <ul className="flex flex-col gap-2">
                {mine.map((b, i) => (
                  <li key={b._id}>
                    <NowDivider show={nowMin !== null && isFirstAfter(mine, i, nowMin)} />
                    <Row b={b} currency={currency} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-faint">Sin turnos.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function isFirstAfter(list: AdminBooking[], i: number, now: number) {
  const s = toMinutes(list[i].start);
  const prev = i > 0 ? toMinutes(list[i - 1].start) : -1;
  return s >= now && prev < now;
}

function NowDivider({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink" aria-hidden="true">
      <span className="h-px flex-1 bg-ink" /> Ahora <span className="h-px flex-1 bg-ink" />
    </div>
  );
}

function Row({
  b,
  currency,
  onSelect,
  showBarber,
}: {
  b: AdminBooking;
  currency: string;
  onSelect: (b: AdminBooking) => void;
  showBarber?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(b)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]",
        b.status === "confirmed" && "border-line-strong bg-card",
        b.status === "completed" && "border-line bg-surface",
        b.status === "no_show" && "border-line bg-surface",
        b.status === "cancelled" && "border-dashed border-line bg-transparent opacity-70",
      )}
      style={b.status === "no_show" ? { backgroundImage: STRIPES } : undefined}
    >
      <div className="w-12 shrink-0 tabular-nums">
        <p className={cn("text-base font-semibold leading-none", b.status !== "confirmed" && "text-dim")}>{b.start}</p>
        <p className="mt-1 text-[11px] text-faint">{b.end}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("flex items-center gap-1.5 truncate font-medium", b.status === "cancelled" && "line-through")}>
          <span className="truncate">{b.clientName || b.clientPhone}</span>
          {b.membershipApplied && <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-label="Membresía" />}
          {b.notes && <StickyNote className="h-3.5 w-3.5 shrink-0 text-dim" aria-label="Tiene notas" />}
        </p>
        <p className="truncate text-xs text-dim">
          {b.serviceName}
          {showBarber && ` · ${b.barberName}`} · {formatPrice(b.finalPrice, currency)}
        </p>
      </div>
      {b.status !== "confirmed" && <StatusPill status={b.status} className="shrink-0" />}
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
    </button>
  );
}
