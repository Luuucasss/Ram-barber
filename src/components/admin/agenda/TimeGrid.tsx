"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, StickyNote } from "lucide-react";
import { toHHMM, toMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AdminBooking, AgendaBarber, AgendaTimeOff } from "@/components/admin/bookings/types";
import { layoutLanes, rangesFor, timeOffsFor } from "./layout";

const PX = 1.6; // px per minute → 48px per half hour
const GUTTER = 56;
const COL_MIN = 168;

export const HATCH = "repeating-linear-gradient(135deg, rgba(255,255,255,0.075) 0 2px, transparent 2px 9px)";
export const STRIPES = "repeating-linear-gradient(135deg, rgba(255,255,255,0.09) 0 6px, transparent 6px 12px)";

export function blockClasses(status: AdminBooking["status"]) {
  switch (status) {
    case "completed":
      return "border border-ink bg-ink text-bg";
    case "no_show":
      return "border border-line-strong bg-card text-dim";
    case "cancelled":
      return "border border-dashed border-line-strong bg-transparent text-faint";
    default:
      return "border border-ink bg-card-2 text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)]";
  }
}

export function TimeGrid({
  date,
  barbers,
  bookings,
  timeOffs,
  nowMin,
  step = 30,
  onSelect,
  onEmptyClick,
}: {
  date: string;
  barbers: AgendaBarber[];
  bookings: AdminBooking[];
  timeOffs: AgendaTimeOff[];
  /** Minutes since midnight when viewing today, otherwise null. */
  nowMin: number | null;
  step?: number;
  onSelect: (b: AdminBooking) => void;
  onEmptyClick: (barberId: string, start: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ barberId: string; min: number } | null>(null);

  const { start, end } = useMemo(() => {
    const mins: number[] = [];
    const maxs: number[] = [];
    for (const b of barbers) for (const [s, e] of rangesFor(b, date)) (mins.push(s), maxs.push(e));
    for (const b of bookings) (mins.push(toMinutes(b.start)), maxs.push(toMinutes(b.end)));
    const s = mins.length ? Math.min(...mins) : 9 * 60;
    const e = maxs.length ? Math.max(...maxs) : 20 * 60;
    return { start: Math.floor(s / 60) * 60, end: Math.max(Math.ceil(e / 60) * 60, Math.floor(s / 60) * 60 + 120) };
  }, [barbers, bookings, date]);

  const height = (end - start) * PX;
  const y = (min: number) => (min - start) * PX;
  const template = `${GUTTER}px repeat(${barbers.length}, minmax(${COL_MIN}px, 1fr))`;
  const minWidth = GUTTER + barbers.length * COL_MIN;

  // Bring "now" (or the first booking / opening time) into view when the day changes.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || scrolledFor.current === date) return;
    scrolledFor.current = date;
    const first = bookings.length ? Math.min(...bookings.map((b) => toMinutes(b.start))) : start;
    const target = nowMin !== null && nowMin >= start && nowMin <= end ? nowMin - 45 : first - 15;
    el.scrollTop = Math.max(0, y(target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, start]);

  const hours: number[] = [];
  for (let m = start; m <= end; m += 60) hours.push(m);
  const lines: number[] = [];
  for (let m = start + 30; m < end; m += 30) lines.push(m);

  return (
    <div
      ref={scroller}
      className="relative max-h-[calc(100dvh-300px)] min-h-[440px] overflow-auto overscroll-contain rounded-[var(--radius-card)] border border-line bg-surface"
    >
      <div style={{ minWidth }}>
        {/* Header */}
        <div
          className="sticky top-0 z-30 grid border-b border-line bg-surface/95 backdrop-blur"
          style={{ gridTemplateColumns: template }}
        >
          <div className="sticky left-0 z-10 border-r border-line bg-surface" />
          {barbers.map((b) => {
            const count = bookings.filter((x) => x.barberId === b._id && x.status !== "cancelled").length;
            const offAll = timeOffsFor(b, timeOffs).find((t) => t.allDay);
            const working = rangesFor(b, date).length > 0;
            return (
              <div key={b._id} className="flex min-w-0 items-center justify-between gap-2 border-l border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <p className="truncate text-[11px] text-faint">
                    {offAll
                      ? offAll.reason || "No trabaja"
                      : !working
                        ? "Sin horario hoy"
                        : !b.active
                          ? "Inactivo"
                          : `${count} ${count === 1 ? "turno" : "turnos"}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="relative grid" style={{ gridTemplateColumns: template, height }}>
          {/* Grid lines */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {lines.map((m) => (
              <div
                key={m}
                className={cn(
                  "absolute right-0 border-t",
                  (m - start) % 60 === 0 ? "border-line" : "border-dashed border-line/60",
                )}
                style={{ top: y(m), left: GUTTER }}
              />
            ))}
          </div>

          {/* Hour gutter */}
          <div className="sticky left-0 z-20 border-r border-line bg-surface" aria-hidden="true">
            {hours.map((m, i) => (
              <span
                key={m}
                className={cn(
                  "absolute right-2 text-[11px] tabular-nums text-faint",
                  i === 0 ? "translate-y-1" : "-translate-y-1/2",
                )}
                style={{ top: y(m) }}
              >
                {toHHMM(m)}
              </span>
            ))}
          </div>

          {barbers.map((barber) => {
            const ranges = rangesFor(barber, date);
            const offs = timeOffsFor(barber, timeOffs);
            const mine = bookings.filter((b) => b.barberId === barber._id);
            const placed = layoutLanes(mine);
            const ghost = hover?.barberId === barber._id ? hover.min : null;
            return (
              <div
                key={barber._id}
                className="relative cursor-cell border-l border-line bg-black/35"
                onClick={(e) => {
                  if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.cell) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const min = start + Math.floor((e.clientY - rect.top) / PX / step) * step;
                  onEmptyClick(barber._id, toHHMM(min));
                }}
                onMouseMove={(e) => {
                  const t = e.target as HTMLElement;
                  if (t !== e.currentTarget && !t.dataset.cell) {
                    if (hover) setHover(null);
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const min = start + Math.floor((e.clientY - rect.top) / PX / step) * step;
                  if (hover?.min !== min || hover.barberId !== barber._id) setHover({ barberId: barber._id, min });
                }}
                onMouseLeave={() => setHover(null)}
              >
                {ranges.map(([s, e]) => (
                  <div
                    key={`${s}-${e}`}
                    data-cell="1"
                    className="absolute inset-x-0 bg-surface"
                    style={{ top: y(s), height: (e - s) * PX }}
                  />
                ))}

                {offs.map((t) => {
                  const s = t.allDay ? start : Math.max(start, toMinutes(t.start));
                  const e = t.allDay ? end : Math.min(end, toMinutes(t.end));
                  if (e <= s) return null;
                  return (
                    <div
                      key={t._id}
                      className="pointer-events-none absolute inset-x-0 z-[1] flex items-start border-y border-line px-2 py-1"
                      style={{ top: y(s), height: (e - s) * PX, backgroundImage: HATCH }}
                    >
                      <span className="rounded bg-bg/80 px-1.5 py-0.5 text-[11px] text-dim">
                        {t.reason || "Bloqueado"}
                        {!t.allDay && ` · ${t.start}–${t.end}`}
                      </span>
                    </div>
                  );
                })}

                {ghost !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-[1] flex items-start rounded-lg border border-dashed border-line-strong px-2 py-1 text-[11px] text-dim"
                    style={{ top: y(ghost) + 1, height: step * PX - 2 }}
                    aria-hidden="true"
                  >
                    + {toHHMM(ghost)}
                  </div>
                )}

                {placed.map(({ item: b, lane, lanes }) => {
                  const s = toMinutes(b.start);
                  const e = toMinutes(b.end);
                  const h = Math.max(22, (e - s) * PX - 2);
                  return (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => onSelect(b)}
                      className={cn(
                        "absolute z-[2] flex flex-col overflow-hidden rounded-lg px-2 py-1 text-left transition-[transform,filter] duration-150 ease-out hover:brightness-110 active:scale-[0.98]",
                        blockClasses(b.status),
                        b.status === "cancelled" && "z-[1] opacity-75",
                      )}
                      style={{
                        top: y(s) + 1,
                        height: h,
                        left: `calc(${(lane / lanes) * 100}% + 4px)`,
                        width: `calc(${100 / lanes}% - 8px)`,
                        backgroundImage: b.status === "no_show" ? STRIPES : undefined,
                      }}
                      aria-label={`${b.start} ${b.clientName} — ${b.serviceName}`}
                    >
                      {h < 36 ? (
                        <span className="truncate text-xs">
                          <span className="tabular-nums opacity-70">{b.start}</span>{" "}
                          <span className={cn("font-semibold", b.status === "cancelled" && "line-through")}>
                            {b.clientName || b.clientPhone}
                          </span>
                        </span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "flex items-center gap-1 truncate text-[13px] font-semibold leading-tight",
                              b.status === "cancelled" && "line-through",
                            )}
                          >
                            <span className="truncate">{b.clientName || b.clientPhone}</span>
                            {b.membershipApplied && <BadgeCheck className="h-3 w-3 shrink-0" aria-label="Membresía" />}
                            {b.notes && <StickyNote className="h-3 w-3 shrink-0 opacity-70" aria-label="Tiene notas" />}
                          </span>
                          <span className="truncate text-[11px] leading-tight opacity-70">
                            <span className="tabular-nums">
                              {b.start}–{b.end}
                            </span>{" "}
                            · {b.serviceName}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {nowMin !== null && nowMin >= start && nowMin <= end && (
            <div
              className="pointer-events-none absolute right-0 z-[25] flex items-center"
              style={{ top: y(nowMin), left: 0 }}
              aria-hidden="true"
            >
              <span
                className="sticky left-0 -translate-y-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-bg"
                style={{ marginLeft: 6 }}
              >
                {toHHMM(nowMin)}
              </span>
              <span className="h-px flex-1 -translate-y-1/2 bg-ink shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
