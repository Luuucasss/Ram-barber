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

/**
 * Black & white only: every state is told apart by fill/border weight, never by hue.
 * `className` is merged over the Pill tone (tailwind-merge), so it wins over any colour.
 */
export const STATE_PILL: Record<BookingState, { label: string; tone: PillTone; className: string }> = {
  upcoming: { label: "Confirmado", tone: "neutral", className: "border-ink bg-white/5 text-ink" },
  soon: { label: "Confirmado", tone: "neutral", className: "border-ink bg-white/5 text-ink" },
  past: { label: "Pasado", tone: "neutral", className: "text-dim" },
  cancelled: { label: "Cancelado", tone: "neutral", className: "border-dashed text-dim" },
  completed: { label: "Completado", tone: "ink", className: "" },
  no_show: { label: "No viniste", tone: "neutral", className: "border-dashed text-faint" },
};
