"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { Slot } from "./types";

/** Grid of available start times from the admin availability endpoint (no notice / window limits). */
export function SlotPicker({
  branchId,
  serviceId,
  barberId,
  date,
  excludeBookingId,
  value,
  onChange,
  disabledTime,
}: {
  branchId: string;
  serviceId: string;
  barberId: string;
  date: string;
  excludeBookingId?: string;
  value: string;
  onChange: (time: string, slot: Slot | null) => void;
  /** A time that should not be offered (e.g. the booking's current slot). */
  disabledTime?: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = Boolean(branchId && serviceId && barberId && date);

  useEffect(() => {
    if (!ready) {
      setSlots(null);
      return;
    }
    const ctrl = new AbortController();
    setError(null);
    setSlots(null);
    const qs = new URLSearchParams({ branchId, serviceId, barberId, date });
    if (excludeBookingId) qs.set("excludeBookingId", excludeBookingId);
    api<{ slots: Slot[] }>(`/api/admin/availability?${qs}`, { signal: ctrl.signal })
      .then((r) => setSlots(r.slots))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [ready, branchId, serviceId, barberId, date, excludeBookingId]);

  // Drop a selection that is no longer offered (e.g. after changing the date).
  useEffect(() => {
    if (slots && value && !slots.some((s) => s.time === value)) onChange("", null);
  }, [slots, value, onChange]);

  if (!ready) return <p className="text-sm text-faint">Elegí servicio, barbero y fecha para ver horarios.</p>;
  if (error) return <p className="rounded-xl border border-ink/50 bg-card-2 px-3 py-2 text-sm text-ink" role="alert">{error}</p>;
  if (!slots)
    return (
      <p className="flex items-center gap-2 text-sm text-dim" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buscando horarios…
      </p>
    );
  if (!slots.length) return <p className="text-sm text-dim">No hay horarios libres ese día.</p>;

  return (
    <div role="radiogroup" aria-label="Horario" className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-1.5">
      {slots.map((s) => {
        const active = s.time === value;
        const off = s.time === disabledTime;
        return (
          <button
            key={s.time}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={off}
            onClick={() => onChange(s.time, s)}
            className={cn(
              "h-11 rounded-xl border text-[15px] font-medium tabular-nums sm:h-10 sm:text-sm transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97]",
              active
                ? "border-ink bg-ink text-bg"
                : "border-line bg-surface text-ink hover:border-line-strong hover:bg-card-2",
              off && "cursor-not-allowed opacity-35",
            )}
          >
            {s.time}
          </button>
        );
      })}
    </div>
  );
}
