import type { BookingStatus } from "@/lib/models";

export type BookingState = "upcoming" | "soon" | "past" | "cancelled" | "completed" | "no_show";
export type PillTone = "neutral" | "ok" | "bad" | "warn" | "ink";

/** Soon = starts within this many minutes. */
export const SOON_MINUTES = 120;

export function bookingState(status: BookingStatus, opts: { minutesUntil?: number; isPast?: boolean }): BookingState {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "no_show") return "no_show";
  if (opts.isPast || (opts.minutesUntil !== undefined && opts.minutesUntil < 0)) return "past";
  if (opts.minutesUntil !== undefined && opts.minutesUntil < SOON_MINUTES) return "soon";
  return "upcoming";
}

export const STATE_PILL: Record<BookingState, { label: string; tone: PillTone }> = {
  upcoming: { label: "Confirmado", tone: "ok" },
  soon: { label: "Confirmado", tone: "ok" },
  past: { label: "Pasado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "bad" },
  completed: { label: "Completado", tone: "ink" },
  no_show: { label: "No viniste", tone: "warn" },
};
