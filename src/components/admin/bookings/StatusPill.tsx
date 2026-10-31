import { Pill } from "@/components/ui";
import { STATUS_LABEL, type BookingStatus } from "./types";

const TONE = { confirmed: "neutral", completed: "ok", cancelled: "bad", no_show: "warn" } as const;

export function StatusPill({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <Pill tone={TONE[status]} className={className}>
      <span
        aria-hidden="true"
        className={
          status === "confirmed"
            ? "h-1.5 w-1.5 rounded-full border border-ink"
            : status === "completed"
              ? "h-1.5 w-1.5 rounded-full bg-ok"
              : status === "no_show"
                ? "h-1.5 w-1.5 rounded-full bg-warn"
                : "h-1.5 w-1.5 rounded-full bg-bad"
        }
      />
      {STATUS_LABEL[status]}
    </Pill>
  );
}
