"use client";

import { useEffect, useRef } from "react";
import { Check, Gift, Minus, Plus } from "lucide-react";
import { ConfirmButton } from "@/components/admin/bookings/ConfirmButton";
import { stamp } from "@/components/admin/bookings/fmt";
import { Button, Card, Pill } from "@/components/ui";
import { Rose } from "@/components/ornaments";
import { cn } from "@/lib/utils";
import type { ClientDetailData, Redemption } from "./types";

export function LoyaltyPanel({
  loyalty,
  redemptions,
  busy,
  onAdjust,
  onDeliver,
}: {
  loyalty: ClientDetailData["loyalty"];
  redemptions: Redemption[];
  busy: string | null;
  onAdjust: (delta: 1 | -1) => void;
  onDeliver: (redemptionId: string) => void;
}) {
  const { cardSize, stamps, cycle, steps } = loyalty;

  // Only the stamp that was just added gets the pop — a rare, satisfying moment, not a page-load effect.
  const prev = useRef(stamps);
  const prevCycle = useRef(cycle);
  const justAdded = stamps > prev.current && cycle === prevCycle.current ? stamps : null;
  useEffect(() => {
    prev.current = stamps;
    prevCycle.current = cycle;
  }, [stamps, cycle]);

  const completesCard = stamps + 1 >= cardSize;
  const canRemove = stamps > 0 || cycle > 1;
  const pending = loyalty.pendingCycles;
  const sortedRedemptions = [...redemptions].sort((a, b) => b.chosenAt.localeCompare(a.chosenAt));

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Rose size={18} tone="light" className="shrink-0" /> Tarjeta de fidelidad
          </h2>
          <p className="mt-0.5 text-sm text-dim">
            Tarjeta #{cycle} · {loyalty.totalCuts} cortes en total
          </p>
        </div>
        {!loyalty.enabled && (
          <Pill tone="neutral" className="shrink-0 border-dashed">
            Programa desactivado
          </Pill>
        )}
      </div>

      <ol
        className={cn("grid gap-2", !loyalty.enabled && "opacity-50")}
        style={{ gridTemplateColumns: `repeat(${Math.min(cardSize, 6)}, minmax(0, 1fr))` }}
        aria-label={`${stamps} de ${cardSize} sellos`}
      >
        {Array.from({ length: cardSize }, (_, i) => {
          const pos = i + 1;
          const filled = pos <= stamps;
          const isNext = pos === stamps + 1;
          const step = steps.find((s) => s.position === pos);
          return (
            <li key={pos} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex aspect-square w-full max-w-12 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  filled
                    ? "border-ink bg-ink text-bg"
                    : isNext
                      ? "border-dashed border-ink text-ink"
                      : "border-line-strong text-faint",
                  pos === justAdded && "animate-pop",
                )}
              >
                {filled ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : step?.gift ? (
                  <Gift className="h-4 w-4" aria-hidden="true" />
                ) : (
                  pos
                )}
              </span>
              <span className="h-3.5 text-[10px] leading-none text-dim">
                {step ? (step.percent ? `${step.percent}%` : step.gift ? "Regalo" : "") : ""}
              </span>
            </li>
          );
        })}
      </ol>

      {loyalty.next.percent > 0 || loyalty.next.gift ? (
        <p className="-mt-2 text-sm text-dim">
          Próximo corte:{" "}
          <span className="text-ink">
            {loyalty.next.percent > 0 && `${loyalty.next.percent}% de descuento`}
            {loyalty.next.percent > 0 && loyalty.next.gift && " + "}
            {loyalty.next.gift && "regalo"}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ConfirmButton
          size="sm"
          variant="outline"
          className="h-12 sm:h-9"
          onConfirm={() => onAdjust(1)}
          loading={busy === "adjust:1"}
          disabled={!!busy}
          confirmLabel={completesCard ? "¿Completar tarjeta?" : "¿Sumar sello?"}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Sumar sello
        </ConfirmButton>
        <ConfirmButton
          size="sm"
          variant="ghost"
          className="h-12 sm:h-9"
          onConfirm={() => onAdjust(-1)}
          loading={busy === "adjust:-1"}
          disabled={!!busy || !canRemove}
          confirmLabel="¿Quitar sello?"
        >
          <Minus className="h-4 w-4" aria-hidden="true" /> Quitar sello
        </ConfirmButton>
      </div>
      <p className="-mt-3 text-xs text-faint">
        Los sellos se suman solos al marcar &quot;Asistió&quot;. Ajustá a mano solo para corregir.
      </p>

      {(pending.length > 0 || sortedRedemptions.length > 0) && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Regalos</h3>
          {pending.map((c) => (
            <div
              key={`p-${c}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-ink/50 bg-white/[0.04] px-3 py-2.5 text-sm"
            >
              <Gift className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
              <span className="flex-1">
                Tarjeta #{c} completa <span className="text-dim">· falta que elija su regalo</span>
              </span>
            </div>
          ))}
          {sortedRedemptions.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line px-3 py-2.5 text-sm">
              <Gift className={cn("h-4 w-4 shrink-0", r.deliveredAt ? "text-faint" : "text-ink")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.rewardName}</p>
                <p className="text-xs text-faint">
                  Tarjeta #{r.cycle} · código <span className="font-mono text-dim">{r.code}</span> · {stamp(r.chosenAt)}
                </p>
              </div>
              {r.deliveredAt ? (
                <Pill tone="neutral" className="shrink-0 border-ink/60 text-ink">
                  Entregado {stamp(r.deliveredAt).split(" ")[0]}
                </Pill>
              ) : (
                <Button
                  size="sm"
                  variant="subtle"
                  className="h-11 shrink-0 max-sm:w-full sm:h-9"
                  onClick={() => onDeliver(r._id)}
                  loading={busy === `deliver:${r._id}`}
                  disabled={!!busy}
                >
                  Marcar entregado
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
