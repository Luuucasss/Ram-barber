"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/public/PublicShell";
import { CtaLink } from "@/components/public/manage/CtaLink";
import { Button, Pill } from "@/components/ui";
import type { PublicPlan } from "@/app/api/public/loyalty/_payload";
import { formatPrice } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";

/** "Planes de exclusividad": plans sorted by price per cut; the request goes through WhatsApp. */
export function Plans({
  plans,
  phone,
  whatsapp,
  currency,
}: {
  plans: PublicPlan[];
  phone: string;
  whatsapp: string;
  currency: string;
}) {
  const [selected, setSelected] = useState<string | null>(plans[0]?.id ?? null);
  const plan = plans.find((p) => p.id === selected);

  if (!plans.length) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-dim">
        Todavía no hay planes disponibles. Consultanos por WhatsApp.
      </p>
    );
  }

  const message = plan
    ? `Hola! Quiero el plan de ${plan.cuts} cortes (${formatPrice(plan.price, currency)}). Mi teléfono es ${formatPhone(phone)}.`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-serif text-lg italic text-dim">
        Pagás una vez por mes y tus cortes te salen más baratos.
      </p>

      <div role="radiogroup" aria-label="Planes" className="stagger flex flex-col gap-3">
        {plans.map((p, i) => {
          const isSel = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isSel}
              onClick={() => setSelected(p.id)}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "relative flex items-start gap-4 rounded-[var(--radius-card)] border p-4 text-left",
                "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out active:scale-[0.985]",
                isSel
                  ? "border-ink bg-card-2 shadow-[0_0_0_1px_var(--color-ink),0_18px_50px_-30px_rgba(255,255,255,0.5)]"
                  : "border-line bg-card hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150",
                  isSel ? "border-ink bg-ink text-bg" : "border-line-strong",
                )}
                aria-hidden="true"
              >
                <Check
                  className={cn(
                    "h-3 w-3 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isSel ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                  strokeWidth={3.5}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{p.name}</p>
                  {i === 0 && plans.length > 1 && (
                    <Pill tone="ink" className="py-0 text-[10px] uppercase tracking-wider">
                      Mejor precio por corte
                    </Pill>
                  )}
                </div>
                <p className="text-sm text-dim">
                  {p.cuts} {p.cuts === 1 ? "corte" : "cortes"} por mes
                </p>
                {p.description && <p className="mt-1.5 text-xs text-faint">{p.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-serif text-2xl font-semibold leading-none tabular-nums">{formatPrice(p.price, currency)}</p>
                <p className="mt-1 text-xs text-dim">{formatPrice(p.pricePerCut, currency)} c/u</p>
              </div>
            </button>
          );
        })}
      </div>

      {plan ? (
        <CtaLink href={whatsappLink(whatsapp, message)} external size="lg" block>
          <WhatsAppIcon className="h-5 w-5" /> Quiero este plan
        </CtaLink>
      ) : (
        <Button size="lg" block disabled>
          Elegí un plan
        </Button>
      )}
      <p className="text-center text-xs text-faint">Te respondemos por WhatsApp para coordinar el pago y activarlo.</p>
    </div>
  );
}
