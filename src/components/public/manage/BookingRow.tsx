import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Pill } from "@/components/ui";
import type { PublicBooking } from "@/lib/bookings";
import { dateChip, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATE_PILL, bookingState } from "./status";

/** Compact booking line used in lists: date tile, service, barber, status and a "manage" affordance. */
export function BookingRow({
  booking,
  today,
  isPast,
  cta,
  className,
  style,
}: {
  booking: PublicBooking;
  today: string;
  isPast?: boolean;
  cta: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const chip = dateChip(booking.date);
  const state = bookingState(booking.status, { isPast });
  const pill = STATE_PILL[state];
  const dimmed = state !== "upcoming" && state !== "soon";
  return (
    <Link
      href={`/turno/${booking.token}`}
      style={style}
      className={cn(
        "group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card p-3 pr-4",
        "transition-[transform,border-color,background-color] duration-200 ease-out hover:border-line-strong hover:bg-card-2 active:scale-[0.985]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border",
          dimmed ? "border-line text-dim" : "border-line-strong text-ink",
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">{chip.day}</span>
        <span className="font-serif text-2xl leading-none font-semibold">{chip.num}</span>
        <span className="text-[10px] uppercase tracking-widest text-faint">{chip.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate font-medium", dimmed ? "text-dim" : "text-ink")}>
            {relativeDay(booking.date, today)} · {booking.start} hs
          </p>
        </div>
        <p className="truncate text-sm text-dim">
          {booking.serviceName}
          {booking.barberName ? ` con ${booking.barberName}` : ""}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Pill tone={pill.tone} className="py-0 text-[11px]">
            {pill.label}
          </Pill>
          <span className="inline-flex items-center text-xs font-medium text-dim transition-colors group-hover:text-ink">
            {cta}
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
