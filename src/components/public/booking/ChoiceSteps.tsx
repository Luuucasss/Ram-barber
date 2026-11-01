"use client";

import Link from "next/link";
import { CalendarCheck, Clock, Gift, MapPin, Sparkles, Users } from "lucide-react";
import { Pill } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import type { AppSettings } from "@/lib/validation";
import { Avatar, Notice, OptionCard, PriceTag } from "./parts";
import type { CatalogBarber, CatalogBranch, CatalogService, IdentifyResult } from "./types";

const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;

export type Pricing = { final: number; percent: number; label: string | null; membership: boolean };

/** Client-side preview of lib/loyalty `priceFor` (membership > loyalty discount > full price). */
export function pricingFor(
  service: Pick<CatalogService, "price" | "includedInPlan">,
  identity: IdentifyResult | null,
  settings: AppSettings,
): Pricing {
  if (identity?.loyalty.member && settings.membershipEnabled && service.includedInPlan) {
    return { final: 0, percent: 100, label: "Incluido en tu plan", membership: true };
  }
  const p = identity && settings.loyalty.enabled ? identity.loyalty.nextPercent : 0;
  if (p > 0) {
    return {
      final: Math.round(service.price * (1 - p / 100)),
      percent: p,
      label: `${p}% off Fidelidad RAM`,
      membership: false,
    };
  }
  return { final: service.price, percent: 0, label: null, membership: false };
}

export function BranchStep({
  branches,
  selectedId,
  onSelect,
}: {
  branches: CatalogBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rb-stagger flex flex-col gap-3">
      {branches.map((b, i) => (
        <OptionCard key={b._id} style={idx(i)} selected={selectedId === b._id} onClick={() => onSelect(b._id)}>
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold [overflow-wrap:anywhere]">{b.name}</p>
              {b.address && <p className="mt-0.5 text-sm text-dim">{b.address}</p>}
            </div>
          </div>
        </OptionCard>
      ))}
    </div>
  );
}

export function IdentityBanner({
  identity,
  settings,
  showUpcoming = true,
}: {
  identity: IdentifyResult;
  settings: AppSettings;
  /** Hide the "Ya tenés N turnos" line (e.g. when a limit notice already says it). */
  showUpcoming?: boolean;
}) {
  const { loyalty, upcomingCount, firstName } = identity;
  const perks: React.ReactNode[] = [];
  if (loyalty.member && settings.membershipEnabled) {
    perks.push(
      <span key="m" className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Tu plan cubre los servicios marcados.
      </span>,
    );
  } else if (settings.loyalty.enabled && loyalty.nextPercent > 0) {
    perks.push(
      <span key="d" className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> En este turno tenés {loyalty.nextPercent}% off por Fidelidad RAM.
      </span>,
    );
  }
  if (settings.loyalty.enabled && loyalty.nextGift && !loyalty.member) {
    perks.push(
      <span key="g" className="inline-flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5" aria-hidden="true" /> Con este corte completás tu tarjeta: ¡te ganás un regalo!
      </span>,
    );
  }

  return (
    <div className="rb-notice mb-5 rounded-2xl border border-line bg-card/70 px-4 py-3">
      <p className="font-serif text-xl italic leading-tight">
        {firstName ? `¡Hola, ${firstName}!` : "¡Bienvenido a RAM!"}
      </p>
      {perks.length > 0 && <div className="mt-2 flex flex-col gap-1 text-sm text-ink">{perks}</div>}
      {showUpcoming && upcomingCount > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-dim">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Ya tenés {upcomingCount} {upcomingCount === 1 ? "turno reservado" : "turnos reservados"}.</span>
          {/* min-size grows the tap area to 44x44; negative margins keep the line's height and alignment. */}
          <Link
            href="/mis-turnos"
            className="-mx-2.5 -my-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            Ver
          </Link>
        </p>
      )}
    </div>
  );
}

export function ServiceStep({
  services,
  selectedId,
  identity,
  settings,
  onSelect,
}: {
  services: CatalogService[];
  selectedId: string | null;
  identity: IdentifyResult | null;
  settings: AppSettings;
  onSelect: (id: string) => void;
}) {
  if (!services.length) {
    return (
      <Notice tone="warn">
        Todavía no hay servicios disponibles para reservar online. Escribinos por WhatsApp y lo coordinamos.
      </Notice>
    );
  }
  return (
    <div className="rb-stagger flex flex-col gap-3">
      {services.map((s, i) => {
        const p = pricingFor(s, identity, settings);
        return (
          <OptionCard key={s._id} style={idx(i)} selected={selectedId === s._id} onClick={() => onSelect(s._id)}>
            {/* Only the first line reserves room for the check badge; the description gets the full width. */}
            <div className="flex items-start justify-between gap-3 pr-8">
              <p className="min-w-0 text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{s.name}</p>
              <PriceTag price={s.price} final={p.final} currency={settings.currency} className="shrink-0 whitespace-nowrap pt-0.5 text-lg" />
            </div>
            {s.description && <p className="mt-1 text-sm leading-relaxed text-dim">{s.description}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-faint">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatDuration(s.durationMin)}
              </span>
              {p.label && <Pill tone="ink">{p.label}</Pill>}
            </div>
          </OptionCard>
        );
      })}
    </div>
  );
}

export function BarberStep({
  barbers,
  selectedId,
  onSelect,
}: {
  barbers: CatalogBarber[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rb-stagger grid grid-cols-2 gap-3">
      <OptionCard
        style={idx(0)}
        selected={selectedId === "any"}
        onClick={() => onSelect("any")}
        className="col-span-2"
      >
        <div className="flex items-center gap-4 pr-8">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-dashed border-line-strong">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold">Cualquiera</p>
            <p className="text-sm text-dim">Primer disponible · más horarios</p>
          </div>
        </div>
      </OptionCard>
      {barbers.map((b, i) => (
        <OptionCard key={b._id} style={idx(i + 1)} selected={selectedId === b._id} onClick={() => onSelect(b._id)}>
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Avatar name={b.name} photoUrl={b.photoUrl} size={72} />
            <div className="w-full min-w-0">
              <p className="font-semibold [overflow-wrap:anywhere]">{b.name}</p>
              {b.bio && <p className="mt-0.5 line-clamp-2 text-xs text-dim">{b.bio}</p>}
            </div>
          </div>
        </OptionCard>
      ))}
    </div>
  );
}
