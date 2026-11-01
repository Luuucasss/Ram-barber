import { Pill } from "@/components/ui";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type BookingStatus } from "./types";

/**
 * Black & white only: statuses are told apart by fill, border style and dot, never by hue.
 * confirmed = hollow dot · completed = solid ink outline + filled dot · no-show = dashed border ·
 * cancelled = faint and struck through.
 */
const STYLE: Record<BookingStatus, { pill: string; dot: string }> = {
  confirmed: { pill: "border-line-strong text-dim", dot: "border border-ink" },
  completed: { pill: "border-ink/70 bg-white/[0.06] text-ink", dot: "bg-ink" },
  no_show: { pill: "border-dashed border-ink/50 text-dim", dot: "border border-dashed border-dim" },
  cancelled: { pill: "border-line text-faint [&>span:last-child]:line-through", dot: "bg-faint" },
};

export function StatusPill({ status, className }: { status: BookingStatus; className?: string }) {
  const s = STYLE[status];
  return (
    <Pill tone="neutral" className={cn(s.pill, className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
      <span>{STATUS_LABEL[status]}</span>
    </Pill>
  );
}
