"use client";

import { useState } from "react";
import { Crown, PauseCircle, Smartphone, Sparkles, Stamp } from "lucide-react";
import { Logo } from "@/components/ornaments";
import { PublicShell } from "@/components/public/PublicShell";
import { CtaLink } from "@/components/public/manage/CtaLink";
import { PhoneLookup } from "@/components/public/manage/PhoneLookup";
import { savePhone } from "@/components/public/manage/storage";
import { Card } from "@/components/ui";
import type { LoyaltyPayload } from "@/app/api/public/loyalty/_payload";
import { ApiClientError, api } from "@/lib/client-api";
import type { LoyaltyView } from "@/lib/loyalty";
import { formatPhone } from "@/lib/phone";
import type { AppSettings } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { MemberCard } from "./MemberCard";
import { Plans } from "./Plans";
import { RedemptionCodes } from "./RedemptionCodes";
import { RewardPicker } from "./RewardPicker";
import { StampCard, stepLabel } from "./StampCard";

export type LoyaltyPreview = {
  enabled: boolean;
  cardSize: number;
  steps: AppSettings["loyalty"]["steps"];
  membershipEnabled: boolean;
};

type Tab = "card" | "plans";

export function Loyalty({ whatsapp, preview }: { whatsapp: string; preview: LoyaltyPreview }) {
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<LoyaltyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("card");
  const [justRedeemed, setJustRedeemed] = useState<string | null>(null);

  async function fetchCard(p: string, opts: { quiet?: boolean } = {}) {
    if (!opts.quiet) setLoading(true);
    setError("");
    try {
      const res = await api<LoyaltyPayload>("/api/public/loyalty", { body: { phone: p } });
      setPhone(p);
      setData(res);
      savePhone(p);
    } catch (e) {
      if (!opts.quiet) setError(e instanceof ApiClientError ? e.message : "No pudimos cargar tu tarjeta. Probá de nuevo.");
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }

  const showTabs = Boolean(data && !data.loyalty.member && data.membershipEnabled && data.plans.length > 0);

  return (
    <PublicShell backHref="/" label="Fidelidad" whatsapp={data?.whatsapp ?? whatsapp}>
      <header className="stagger mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="h-16 w-auto" />
        <h1
          className="text-balance font-gothic text-[clamp(2.6rem,14.5vw,3.75rem)] leading-[0.9] text-ink"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Fidelidad <span className="text-shimmer">RAM</span>
        </h1>
        <p className="max-w-xs text-balance font-serif text-lg italic text-dim" style={{ "--i": 2 } as React.CSSProperties}>
          {data
            ? data.firstName
              ? `Hola, ${data.firstName}.`
              : data.exists
                ? "Esta es tu tarjeta."
                : "Arrancá tu tarjeta con tu primer corte."
            : "Cada corte suma un sello. Completá la tarjeta y llevate un regalo."}
        </p>
      </header>

      {!data ? (
        <Intro preview={preview} onSubmit={(p) => fetchCard(p)} loading={loading} error={error} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card py-1 pl-4 pr-1 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-dim">
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate tabular-nums text-ink">{formatPhone(phone)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setData(null);
                setJustRedeemed(null);
                setTab("card");
              }}
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 font-medium text-dim underline-offset-4 transition-colors hover:text-ink hover:underline active:bg-white/5"
            >
              Cambiar
            </button>
          </div>

          {data.loyalty.member ? (
            <MemberView
              data={data}
              phone={phone}
              justRedeemed={justRedeemed}
              onRedeemed={(res) => {
                const { redemption, ...rest } = res;
                setData(rest);
                setJustRedeemed(redemption.code);
              }}
              onStale={() => fetchCard(phone, { quiet: true })}
            />
          ) : (
            <>
              {showTabs && <Tabs tab={tab} onChange={setTab} />}
              <div role={showTabs ? "tabpanel" : undefined} key={tab} className="animate-fade [animation-duration:220ms]">
                {tab === "plans" && showTabs ? (
                  <Plans plans={data.plans} phone={phone} whatsapp={data.whatsapp} currency={data.currency} />
                ) : (
                  <CardView
                    data={data}
                    phone={phone}
                    justRedeemed={justRedeemed}
                    onRedeemed={(res) => {
                      const { redemption, ...rest } = res;
                      setData(rest);
                      setJustRedeemed(redemption.code);
                    }}
                    onStale={() => fetchCard(phone, { quiet: true })}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </PublicShell>
  );
}

/* ------------------------------------------------------------------ */

function Intro({
  preview,
  onSubmit,
  loading,
  error,
}: {
  preview: LoyaltyPreview;
  onSubmit: (phone: string) => void;
  loading: boolean;
  error: string;
}) {
  const demoStamps = Math.max(0, Math.min(3, preview.cardSize - 2));
  const steps = [...preview.steps].sort((a, b) => a.position - b.position).filter((s) => s.percent > 0 || s.gift);
  return (
    <div className="flex flex-col gap-8">
      <Card className="animate-reveal p-5 [animation-delay:160ms]">
        <PhoneLookup onSubmit={onSubmit} loading={loading} error={error} submitLabel="Ver mi tarjeta" autoFocus />
      </Card>

      {preview.enabled && (
        <section aria-labelledby="how-title" className="flex flex-col gap-4">
          <h2 id="how-title" className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-dim">
            Así funciona
          </h2>
          <StampCard
            cardSize={preview.cardSize}
            steps={preview.steps}
            stamps={demoStamps}
            cycle={1}
            badge="Ejemplo"
            footer={`Cada corte completado suma un sello · ${preview.cardSize} sellos completan la tarjeta`}
          />
          {steps.length > 0 && (
            <ul className="stagger flex flex-col gap-2">
              {steps.map((s, i) => (
                <li
                  key={s.position}
                  style={{ "--i": i } as React.CSSProperties}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm"
                >
                  <span className="shrink-0 text-dim">
                    Tu <span className="font-semibold text-ink">{s.position}° corte</span>
                  </span>
                  <span className="text-right font-semibold uppercase tracking-wider text-ink">{stepLabel(s)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "card", label: "Mi tarjeta", icon: <Stamp className="h-4 w-4" aria-hidden="true" /> },
    { id: "plans", label: "Planes de exclusividad", icon: <Crown className="h-4 w-4" aria-hidden="true" /> },
  ];
  return (
    <div role="tablist" aria-label="Fidelidad" className="relative grid grid-cols-2 rounded-2xl border border-line bg-surface p-1">
      {/* Sliding indicator: moves on screen → strong ease-in-out, transform only. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-ink transition-transform duration-[260ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
        style={{ transform: tab === "plans" ? "translateX(100%)" : "translateX(0)" }}
      />
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative z-10 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-center text-[13px] font-semibold leading-tight transition-colors duration-200",
              active ? "text-bg" : "text-dim hover:text-ink",
            )}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function lastVisitLabel(iso: string | null, timezone: string) {
  if (!iso) return "todavía no";
  try {
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: timezone }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function cardMessage(l: LoyaltyView): { title: string; body: string; icon: "spark" | "pause" } {
  if (l.member) {
    return {
      icon: "pause",
      title: "Tu tarjeta está en pausa",
      body: "Mientras tu plan esté vigente, tus cortes se descuentan del plan y no suman sellos.",
    };
  }
  if (!l.enabled) {
    return {
      icon: "pause",
      title: "El programa de sellos está en pausa",
      body: "Por ahora no estamos sumando sellos. Tus regalos pendientes siguen valiendo.",
    };
  }
  const steps = [...l.steps].sort((a, b) => a.position - b.position);
  if (l.cycle === 1 && l.stamps === 0 && l.totalCuts === 0) {
    const second = steps.find((s) => s.position === 2 && s.percent > 0);
    return {
      icon: "spark",
      title: "Arrancá tu tarjeta con tu primer corte",
      body: `Decile tu teléfono al barbero y te suma el sello.${second ? " Tu 2do corte ya tiene descuento." : ""}`,
    };
  }
  if (l.next.gift) {
    return {
      icon: "spark",
      title: l.next.percent ? `Tu próximo corte: ${l.next.percent}% OFF + regalo` : "Tu próximo corte trae regalo",
      body: "Con ese corte completás la tarjeta y elegís tu regalo acá mismo.",
    };
  }
  if (l.next.percent) {
    return {
      icon: "spark",
      title: `Tu próximo corte tiene ${l.next.percent}% OFF`,
      body: "Reservá con este mismo teléfono y el descuento se aplica solo.",
    };
  }
  const left = l.cardSize - l.stamps;
  if (left <= 2) {
    return {
      icon: "spark",
      title: left === 1 ? "¡Te falta 1 corte!" : `¡Te faltan ${left} cortes!`,
      body: "Estás a nada de completar la tarjeta.",
    };
  }
  const upcoming = steps.find((s) => s.position > l.next.position && (s.percent > 0 || s.gift));
  return {
    icon: "spark",
    title: `Llevás ${l.stamps} de ${l.cardSize} sellos`,
    body: upcoming
      ? `En tu corte N° ${upcoming.position} tenés ${stepLabel(upcoming)}.`
      : "Seguí sumando sellos con cada corte.",
  };
}

function Message({ loyalty }: { loyalty: LoyaltyView }) {
  const msg = cardMessage(loyalty);
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink">
        {msg.icon === "pause" ? <PauseCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className="text-balance font-semibold text-ink">{msg.title}</p>
        <p className="text-sm text-dim">{msg.body}</p>
      </div>
    </div>
  );
}

function CardView({
  data,
  phone,
  justRedeemed,
  onRedeemed,
  onStale,
}: {
  data: LoyaltyPayload;
  phone: string;
  justRedeemed: string | null;
  onRedeemed: React.ComponentProps<typeof RewardPicker>["onRedeemed"];
  onStale: () => void;
}) {
  const l = data.loyalty;
  return (
    <div className="flex flex-col gap-6">
      {l.pendingCycles.length > 0 && (
        <RewardPicker
          phone={phone}
          pendingCycles={l.pendingCycles}
          rewards={data.rewards}
          onRedeemed={onRedeemed}
          onStale={onStale}
        />
      )}

      <StampCard
        cardSize={l.cardSize}
        steps={l.steps}
        stamps={l.stamps}
        cycle={l.cycle}
        paused={!l.enabled}
        badge={!l.enabled ? "En pausa" : undefined}
        footer={
          <>
            <span className="font-semibold text-ink">
              {l.stamps} de {l.cardSize}
            </span>{" "}
            cortes · Último corte: {lastVisitLabel(l.lastVisitAt, data.timezone)}
          </>
        }
      />

      <Message loyalty={l} />

      <RedemptionCodes redemptions={l.redemptions} highlight={justRedeemed} timezone={data.timezone} />

      <CtaLink href="/reservar" variant="outline" size="lg" block>
        Reservar mi próximo corte
      </CtaLink>
    </div>
  );
}

function MemberView({
  data,
  phone,
  justRedeemed,
  onRedeemed,
  onStale,
}: {
  data: LoyaltyPayload;
  phone: string;
  justRedeemed: string | null;
  onRedeemed: React.ComponentProps<typeof RewardPicker>["onRedeemed"];
  onStale: () => void;
}) {
  const l = data.loyalty;
  if (!l.member) return null;
  return (
    <div className="flex flex-col gap-6">
      <MemberCard member={l.member} />
      {/* Primary action right under the plan card, within thumb reach — not 2000px down the page. */}
      <CtaLink href="/reservar" size="lg" block>
        Reservar con mi plan
      </CtaLink>
      {/* Gifts earned before the plan started are still theirs to pick. */}
      {l.pendingCycles.length > 0 && (
        <RewardPicker
          phone={phone}
          pendingCycles={l.pendingCycles}
          rewards={data.rewards}
          onRedeemed={onRedeemed}
          onStale={onStale}
        />
      )}
      <RedemptionCodes redemptions={l.redemptions} highlight={justRedeemed} timezone={data.timezone} />
      <Message loyalty={l} />
      {l.enabled && (
        <StampCard
          cardSize={l.cardSize}
          steps={l.steps}
          stamps={l.stamps}
          cycle={l.cycle}
          paused
          badge="En pausa"
          footer={
            <>
              {l.stamps} de {l.cardSize} cortes · Último corte: {lastVisitLabel(l.lastVisitAt, data.timezone)}
            </>
          }
        />
      )}
    </div>
  );
}
