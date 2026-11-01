"use client";

import { useState } from "react";
import { Check, Gift } from "lucide-react";
import { HaloRays, Rose } from "@/components/ornaments";
import { Button, ErrorText } from "@/components/ui";
import type { LoyaltyPayload, PublicReward } from "@/app/api/public/loyalty/_payload";
import { ApiClientError, api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type RedeemResponse = LoyaltyPayload & { redemption: { cycle: number; rewardName: string; code: string } };

/** "Tenés un regalo para elegir": reward cards + atomic redeem. */
export function RewardPicker({
  phone,
  pendingCycles,
  rewards,
  onRedeemed,
  onStale,
}: {
  phone: string;
  pendingCycles: number[];
  rewards: PublicReward[];
  onRedeemed: (res: RedeemResponse) => void;
  /** Called when the server says our view is outdated (sold out / already chosen). */
  onStale: () => void;
}) {
  const cycles = [...pendingCycles].sort((a, b) => a - b);
  const cycle = cycles[0];
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function redeem() {
    if (!selected || cycle === undefined) return;
    setSaving(true);
    setError("");
    try {
      const res = await api<RedeemResponse>("/api/public/loyalty/redeem", { body: { phone, cycle, rewardId: selected } });
      setSelected(null);
      onRedeemed(res);
    } catch (e) {
      const err = e instanceof ApiClientError ? e : null;
      setError(err?.message ?? "No pudimos registrar tu regalo. Probá de nuevo.");
      if (err && (err.code === "out_of_stock" || err.code === "already_redeemed" || err.code === "no_pending")) {
        setSelected(null);
        onStale();
      }
    } finally {
      setSaving(false);
    }
  }

  if (cycle === undefined) return null;
  const chosen = rewards.find((r) => r.id === selected);

  return (
    <section
      aria-labelledby="gift-title"
      className="relative overflow-hidden rounded-[24px] border border-ink/80 bg-card-2 p-4 animate-reveal min-[360px]:p-5"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-40 flex justify-center opacity-25" aria-hidden="true">
        <HaloRays size={420} rays={48} className="animate-spin-slow" />
      </div>

      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="grid h-14 w-14 animate-pop place-items-center rounded-full bg-ink text-bg shadow-[0_0_40px_rgba(255,255,255,0.35)]">
          <Gift className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 id="gift-title" className="text-balance font-gothic text-[clamp(1.9rem,9.5vw,2.25rem)] leading-none">
          {cycles.length > 1 ? `Tenés ${cycles.length} regalos para elegir` : "Tenés un regalo para elegir"}
        </h2>
        <p className="max-w-xs text-balance font-serif text-base italic text-dim">
          Completaste la tarjeta N° {String(cycle).padStart(2, "0")}. Elegí tu regalo y te damos un código para retirarlo.
        </p>
      </div>

      {rewards.length === 0 ? (
        <p className="relative mt-5 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-dim">
          Ahora mismo no hay regalos disponibles. Volvé a mirar en unos días o consultanos por WhatsApp.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Regalos" className="stagger relative mt-5 grid grid-cols-2 gap-2.5 min-[360px]:gap-3">
          {rewards.map((r, i) => {
            const isSel = r.id === selected;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => {
                  setSelected(r.id);
                  setError("");
                }}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left",
                  "transition-[transform,border-color,box-shadow] duration-200 ease-out active:scale-[0.97]",
                  isSel
                    ? "border-ink shadow-[0_0_0_1px_var(--color-ink),0_16px_40px_-20px_rgba(255,255,255,0.45)]"
                    : "border-line hover:border-line-strong",
                )}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover grayscale contrast-125 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Rose size={64} tone="light" className="opacity-80" />
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      isSel ? "scale-100 border-ink bg-ink text-bg opacity-100" : "scale-75 border-line-strong bg-bg/70 opacity-0",
                    )}
                    aria-hidden="true"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  {typeof r.stock === "number" && r.stock <= 5 && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-bg/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
                      {r.stock === 1 ? "Queda 1" : `Quedan ${r.stock}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-3">
                  {/* The name is never clamped: people must see exactly what they pick. */}
                  <p className="text-sm font-semibold leading-tight text-ink [overflow-wrap:anywhere]">{r.name}</p>
                  {r.description && (
                    <p className={cn("text-xs text-dim [overflow-wrap:anywhere]", !isSel && "line-clamp-3")}>
                      {r.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative mt-5 flex flex-col gap-3">
        <ErrorText>{error}</ErrorText>
        {rewards.length > 0 && (
          <>
            <p className="text-center text-sm text-dim [overflow-wrap:anywhere]" aria-live="polite">
              {chosen ? (
                <>
                  Elegiste: <span className="font-semibold text-ink">{chosen.name}</span>
                </>
              ) : (
                "Tocá un regalo para elegirlo."
              )}
            </p>
            <Button size="lg" block disabled={!selected} loading={saving} onClick={redeem}>
              {chosen ? "Confirmar regalo" : "Elegí un regalo"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
