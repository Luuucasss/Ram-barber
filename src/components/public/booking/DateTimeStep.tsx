"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, CalendarX2, Moon, RotateCw, Sun } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { dateChip, formatDateLong, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Notice } from "./parts";
import type { AvailabilityResult, AvailableSlot } from "./types";

const AFTERNOON_FROM = 14 * 60;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type AvailabilityState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; days: AvailabilityResult["days"] };

export function DateTimeStep({
  availability,
  today,
  selectedDate,
  selectedTime,
  durationMin,
  notice,
  onSelectDate,
  onSelectTime,
  onRetry,
}: {
  availability: AvailabilityState;
  today: string;
  selectedDate: string | null;
  selectedTime: string | null;
  durationMin: number;
  notice: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onRetry: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  const days = availability.status === "ready" ? availability.days : [];
  const day = days.find((d) => d.date === selectedDate) ?? null;

  // Keep the selected chip in view (e.g. when the first free day is a week away).
  useEffect(() => {
    if (!selectedDate || !stripRef.current) return;
    const chip = stripRef.current.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedDate, availability.status]);

  const groups = useMemo(() => {
    const slots = day?.slots ?? [];
    const morning = slots.filter((s) => toMin(s.time) < AFTERNOON_FROM);
    const afternoon = slots.filter((s) => toMin(s.time) >= AFTERNOON_FROM);
    return [
      { id: "m", label: "Mañana", icon: Sun, slots: morning },
      { id: "t", label: "Tarde", icon: Moon, slots: afternoon },
    ].filter((g) => g.slots.length);
  }, [day]);

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
          {notice}
        </Notice>
      )}

      {/* Day strip */}
      <section aria-label="Elegí el día">
        {availability.status === "ready" ? (
          <div
            ref={stripRef}
            role="group"
            aria-label="Días disponibles"
            className="rb-days scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1"
          >
            {days.map((d, i) => {
              const chip = dateChip(d.date);
              const free = d.slots.length > 0;
              const active = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${formatDateLong(d.date)}${free ? `, ${d.slots.length} horarios` : ", sin horarios"}`}
                  data-date={d.date}
                  disabled={!free}
                  onClick={() => onSelectDate(d.date)}
                  style={{ "--i": i } as React.CSSProperties}
                  className={cn(
                    "rb-press rb-slot relative flex h-[88px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border",
                    active
                      ? "border-ink bg-ink text-bg shadow-[0_10px_30px_-12px_rgba(255,255,255,0.55)]"
                      : free
                        ? "border-line bg-card text-ink hover:border-line-strong"
                        : "border-line/60 bg-transparent text-faint",
                  )}
                >
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", active ? "text-bg/70" : "text-dim", !free && "text-faint")}>
                    {d.date === today ? "Hoy" : chip.day}
                  </span>
                  <span className={cn("font-gothic text-[28px] leading-none", !free && "line-through decoration-1")}>{chip.num}</span>
                  <span className={cn("text-[11px]", active ? "text-bg/70" : "text-faint")}>{chip.month}</span>
                  {free && !active && (
                    <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-ink/70" />
                  )}
                </button>
              );
            })}
          </div>
        ) : availability.status === "error" ? null : (
          <div className="-mx-4 flex gap-2 overflow-hidden px-4 pt-1" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="rb-skeleton h-[88px] w-[64px] shrink-0 rounded-2xl border border-line" />
            ))}
          </div>
        )}
      </section>

      {/* Slots */}
      <section aria-live="polite" aria-busy={availability.status === "loading" || availability.status === "idle"}>
        {availability.status === "error" ? (
          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
            <p className="text-sm text-dim">{availability.message}</p>
            <Button variant="outline" onClick={onRetry}>
              <RotateCw className="h-4 w-4" aria-hidden="true" /> Reintentar
            </Button>
          </div>
        ) : availability.status !== "ready" ? (
          <SlotsSkeleton />
        ) : !days.some((d) => d.slots.length) ? (
          <EmptyState title="No hay horarios disponibles" icon={<CalendarX2 className="h-6 w-6" />}>
            No quedan turnos libres en los próximos días. Escribinos por WhatsApp y vemos cómo hacerte un lugar.
          </EmptyState>
        ) : !day || !day.slots.length ? (
          <EmptyState title="No hay horarios disponibles este día" icon={<CalendarX2 className="h-6 w-6" />}>
            Probá con otro día.
          </EmptyState>
        ) : (
          <div key={day.date} className="flex flex-col gap-6">
            <p className="rb-swap font-serif text-xl italic text-dim">{relativeDay(day.date, today)}</p>
            {groups.map((g, gi) => (
              <SlotGroup
                key={g.id}
                label={g.label}
                icon={<g.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                slots={g.slots}
                durationMin={durationMin}
                selectedTime={selectedTime}
                offset={gi === 0 ? 0 : groups[0].slots.length}
                onSelect={onSelectTime}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SlotGroup({
  label,
  icon,
  slots,
  durationMin,
  selectedTime,
  offset,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  slots: AvailableSlot[];
  durationMin: number;
  selectedTime: string | null;
  offset: number;
  onSelect: (time: string) => void;
}) {
  const first = slots[0].time;
  const lastEnd = toHHMM(toMin(slots[slots.length - 1].time) + durationMin);
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-dim">
        {icon}
        <span>
          {label} · <span className="tabular-nums">{first} a {lastEnd}</span>
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" aria-hidden="true" />
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((s, i) => {
          const active = s.time === selectedTime;
          return (
            <button
              key={s.time}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(s.time)}
              style={{ "--i": offset + i } as React.CSSProperties}
              className={cn(
                "rb-press rb-slot h-12 rounded-xl border text-[15px] font-semibold tabular-nums",
                active
                  ? "border-ink bg-ink text-bg shadow-[0_10px_30px_-12px_rgba(255,255,255,0.55)]"
                  : "border-line bg-card text-ink hover:border-ink",
              )}
            >
              {s.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only">Buscando horarios disponibles…</span>
      <div className="rb-skeleton h-5 w-28 rounded-md" aria-hidden="true" />
      {[6, 9].map((n, gi) => (
        <div key={gi} aria-hidden="true">
          <div className="rb-skeleton mb-3 h-3 w-40 rounded" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="rb-skeleton h-12 rounded-xl border border-line" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
