"use client";

import { useEffect, useRef } from "react";
import { Gift } from "lucide-react";
import { Pill } from "@/components/ui";
import type { LoyaltyView } from "@/lib/loyalty";
import { cn } from "@/lib/utils";

type Redemption = LoyaltyView["redemptions"][number];

function chosenDate(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: timezone }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** Gift codes the client already picked. Undelivered first, shown big for the counter. */
export function RedemptionCodes({
  redemptions,
  highlight,
  timezone,
}: {
  redemptions: Redemption[];
  /** Code just redeemed: revealed letter by letter and scrolled into view. */
  highlight?: string | null;
  timezone: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  if (!redemptions.length) return null;
  const sorted = [...redemptions].sort(
    (a, b) => Number(Boolean(a.deliveredAt)) - Number(Boolean(b.deliveredAt)) || b.chosenAt.localeCompare(a.chosenAt),
  );

  return (
    <section aria-labelledby="codes-title" className="flex flex-col gap-3">
      <h2 id="codes-title" className="text-[11px] font-semibold uppercase tracking-[0.3em] text-dim">
        Tus regalos
      </h2>
      {sorted.map((r) => {
        const delivered = Boolean(r.deliveredAt);
        const isNew = r.code === highlight;
        if (delivered) {
          return (
            <div
              key={r.code + r.cycle}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-dim">{r.rewardName}</p>
                <p className="font-mono text-xs tracking-[0.3em] text-faint line-through">{r.code}</p>
              </div>
              <Pill tone="neutral" className="shrink-0">
                Entregado
              </Pill>
            </div>
          );
        }
        return (
          <div
            key={r.code + r.cycle}
            ref={isNew ? ref : undefined}
            className={cn(
              "relative scroll-my-6 overflow-hidden rounded-[22px] border bg-card-2 p-4 text-center min-[360px]:p-5",
              isNew ? "border-ink animate-reveal" : "border-line-strong",
            )}
          >
            <div className="flex flex-col items-center gap-2 text-sm text-dim">
              <Pill tone="ink" className="gap-1 py-0 text-[10px]">
                <Gift className="h-3 w-3" aria-hidden="true" /> Para retirar
              </Pill>
              <p className="max-w-full text-balance break-words font-medium text-ink">{r.rewardName}</p>
            </div>
            <p
              className="my-4 break-all pl-[0.3em] font-mono text-[clamp(1.9rem,10vw,2.25rem)] font-bold tracking-[0.3em] text-ink sm:text-5xl"
              aria-label={`Código ${r.code.split("").join(" ")}`}
            >
              {isNew ? (
                <span className="stagger inline-flex flex-wrap justify-center" aria-hidden="true">
                  {r.code.split("").map((ch, i) => (
                    <span key={i} style={{ "--i": i + 2 } as React.CSSProperties}>
                      {ch}
                    </span>
                  ))}
                </span>
              ) : (
                r.code
              )}
            </p>
            <p className="font-serif text-base italic text-dim">
              Mostrá este código en Ram Hair Studio y retirás tu regalo.
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-faint">
              Tarjeta N° {String(r.cycle).padStart(2, "0")}
              {chosenDate(r.chosenAt, timezone) ? ` · Elegido el ${chosenDate(r.chosenAt, timezone)}` : ""}
            </p>
          </div>
        );
      })}
    </section>
  );
}
