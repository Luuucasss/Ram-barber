"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { Toggle } from "@/components/ui";
import { dayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "./parts";
import {
  WEEK_ORDER,
  WEEKDAYS,
  formatHours,
  toHHMM,
  toMin,
  totalMinutes,
  validateDayRanges,
  type DayRange,
  type Range,
} from "./schedule-utils";

type DayState = { enabled: boolean; ranges: Range[] };

const DEFAULT_RANGES: Range[] = [{ start: "09:00", end: "18:00" }];
const MAX_RANGES = 4;

const COPY_TARGETS: { label: string; days: readonly number[] }[] = [
  { label: "Días hábiles (lun a vie)", days: WEEKDAYS },
  { label: "Lunes a sábado", days: [1, 2, 3, 4, 5, 6] },
  { label: "Todos los días", days: [0, 1, 2, 3, 4, 5, 6] },
];

function fromSchedule(schedule: DayRange[]): DayState[] {
  return Array.from({ length: 7 }, (_, day) => {
    const ranges = schedule
      .filter((r) => r.day === day)
      .sort((a, b) => toMin(a.start) - toMin(b.start))
      .map(({ start, end }) => ({ start, end }));
    return { enabled: ranges.length > 0, ranges };
  });
}

function toSchedule(days: DayState[]): DayRange[] {
  return days.flatMap((d, day) => (d.enabled ? d.ranges.map((r) => ({ day, start: r.start, end: r.end })) : []));
}

export function scheduleErrors(schedule: DayRange[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const day of WEEK_ORDER) {
    const msg = validateDayRanges(schedule.filter((r) => r.day === day));
    if (msg) out[day] = msg;
  }
  return out;
}

/**
 * Weekly schedule editor: Monday-first rows, per-day on/off, one or more ranges per day
 * ("turno cortado"), copy-to-days helper, live validation (start < end, no overlaps, 5-min steps).
 * Uncontrolled: seeded from `initial`, reports every change through `onChange`.
 */
export function ScheduleEditor({
  initial,
  onChange,
  showErrors,
}: {
  initial: DayRange[];
  onChange: (schedule: DayRange[]) => void;
  showErrors?: boolean;
}) {
  const [days, setDays] = useState<DayState[]>(() => fromSchedule(initial));
  const [menuDay, setMenuDay] = useState<number | null>(null);
  const rows = useRef(new Map<number, HTMLDivElement>());

  function commit(next: DayState[]) {
    setDays(next);
    onChange(toSchedule(next));
  }

  function patchDay(day: number, fn: (d: DayState) => DayState) {
    commit(days.map((d, i) => (i === day ? fn(d) : d)));
  }

  function template(): Range[] {
    for (const day of WEEK_ORDER) if (days[day].enabled && days[day].ranges.length) return days[day].ranges;
    return DEFAULT_RANGES;
  }

  function toggleDay(day: number, enabled: boolean) {
    patchDay(day, (d) => ({ enabled, ranges: enabled && !d.ranges.length ? template().map((r) => ({ ...r })) : d.ranges }));
  }

  function addRange(day: number) {
    patchDay(day, (d) => {
      const last = d.ranges[d.ranges.length - 1];
      const start = last ? Math.min(toMin(last.end) + 60, 22 * 60) : 9 * 60;
      return { ...d, ranges: [...d.ranges, { start: toHHMM(start), end: toHHMM(Math.min(start + 4 * 60, 23 * 60 + 55)) }] };
    });
  }

  function copyTo(from: number, targets: readonly number[]) {
    const src = days[from];
    commit(days.map((d, i) => (targets.includes(i) && i !== from ? { enabled: true, ranges: src.ranges.map((r) => ({ ...r })) } : d)));
    setMenuDay(null);
    // State indication: briefly highlight the rows that just changed.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const t of targets) {
        if (t === from) continue;
        rows.current.get(t)?.animate([{ backgroundColor: "rgba(244,244,242,0.09)" }, { backgroundColor: "rgba(244,244,242,0)" }], {
          duration: 700,
          easing: "ease",
        });
      }
    }
  }

  const schedule = toSchedule(days);
  const weekTotal = totalMinutes(schedule);
  const workDays = days.filter((d) => d.enabled && d.ranges.length).length;

  return (
    <div className="flex flex-col gap-2">
      {WEEK_ORDER.map((day) => {
        const d = days[day];
        const error = d.enabled ? validateDayRanges(d.ranges) : null;
        const dayTotal = d.enabled ? totalMinutes(d.ranges) : 0;
        return (
          <div
            key={day}
            ref={(el) => {
              if (el) rows.current.set(day, el);
              else rows.current.delete(day);
            }}
            className={cn(
              "rounded-2xl border px-3 py-3 transition-colors duration-200 sm:px-4",
              d.enabled ? "border-line bg-surface" : "border-line/60 bg-transparent",
              error && showErrors && "border-bad/50",
            )}
          >
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:flex-nowrap">
              <div className="flex h-10 w-36 shrink-0 items-center">
                <Toggle
                  checked={d.enabled}
                  onChange={(v) => toggleDay(day, v)}
                  label={<span className={cn("font-medium", !d.enabled && "text-dim")}>{dayName(day)}</span>}
                />
              </div>

              <div className="order-last flex w-full min-w-0 flex-col gap-2 sm:order-none sm:w-auto sm:flex-1">
                {d.enabled ? (
                  <div className="flex animate-[fade_180ms_ease-out_both] flex-col gap-2">
                    {d.ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <TimeInput
                          label={`${dayName(day)}: inicio del turno ${i + 1}`}
                          value={r.start}
                          invalid={Boolean(error)}
                          onChange={(v) =>
                            patchDay(day, (s) => ({ ...s, ranges: s.ranges.map((x, j) => (j === i ? { ...x, start: v } : x)) }))
                          }
                        />
                        <span className="text-xs text-faint">a</span>
                        <TimeInput
                          label={`${dayName(day)}: fin del turno ${i + 1}`}
                          value={r.end}
                          invalid={Boolean(error)}
                          onChange={(v) =>
                            patchDay(day, (s) => ({ ...s, ranges: s.ranges.map((x, j) => (j === i ? { ...x, end: v } : x)) }))
                          }
                        />
                        {d.ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => patchDay(day, (s) => ({ ...s, ranges: s.ranges.filter((_, j) => j !== i) }))}
                            className="rounded-lg p-2 text-faint transition-colors hover:bg-white/5 hover:text-ink"
                            aria-label={`Quitar turno ${i + 1} del ${dayName(day)}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {d.ranges.length < MAX_RANGES && (
                      <button
                        type="button"
                        onClick={() => addRange(day)}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-dim transition-colors hover:text-ink"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {d.ranges.length ? "Turno cortado" : "Agregar horario"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="flex h-10 items-center text-sm text-faint">Cerrado</p>
                )}
              </div>

              <div className="ml-auto flex h-10 items-center gap-1">
                {d.enabled && <span className="text-xs tabular-nums text-faint">{formatHours(dayTotal)}</span>}
                {d.enabled && d.ranges.length > 0 && !error && (
                  <CopyMenu
                    open={menuDay === day}
                    onOpenChange={(o) => setMenuDay(o ? day : null)}
                    onPick={(targets) => copyTo(day, targets)}
                    dayLabel={dayName(day)}
                  />
                )}
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-bad" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      })}
      <p className="px-1 pt-1 text-xs text-dim">
        {workDays ? (
          <>
            {workDays} {workDays === 1 ? "día" : "días"} de atención · <span className="tabular-nums">{formatHours(weekTotal)}</span> por semana
          </>
        ) : (
          "Sin horarios: no va a aparecer disponible para reservar."
        )}
      </p>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <input
      type="time"
      step={300}
      value={value}
      aria-label={label}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-[7.25rem] rounded-xl border border-line bg-bg px-3 text-sm tabular-nums text-ink transition-colors focus:border-ink focus:outline-none aria-[invalid=true]:border-bad/60"
    />
  );
}

function CopyMenu({
  open,
  onOpenChange,
  onPick,
  dayLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (days: readonly number[]) => void;
  dayLabel: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // keep the surrounding <dialog> open
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Copiar horario del ${dayLabel}`}
        title="Copiar este horario a otros días"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
          open ? "bg-white/10 text-ink" : "text-dim hover:bg-white/5 hover:text-ink",
        )}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Copiar</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-56 origin-top-right rounded-2xl border border-line-strong bg-card-2 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] transition-[opacity,transform] duration-150 starting:scale-95 starting:opacity-0"
          style={{ transitionTimingFunction: EASE_OUT }}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">Copiar a…</p>
          {COPY_TARGETS.map((t) => (
            <button
              key={t.label}
              type="button"
              role="menuitem"
              onClick={() => onPick(t.days)}
              className="block w-full rounded-xl px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-white/5"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
