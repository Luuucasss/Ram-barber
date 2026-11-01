"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, ChevronRight, Clock, MapPin, Smartphone } from "lucide-react";
import { HaloRays, Logo, OrnamentDivider } from "@/components/ornaments";
import { PublicShell } from "@/components/public/PublicShell";
import { Card, EmptyState } from "@/components/ui";
import type { MyBookingsResponse } from "@/app/api/public/my-bookings/route";
import type { PublicBooking } from "@/lib/bookings";
import { ApiClientError, api } from "@/lib/client-api";
import { dateChip, relativeDay } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { BookingRow } from "./BookingRow";
import { CtaLink } from "./CtaLink";
import { PhoneLookup } from "./PhoneLookup";
import { localToday, readSavedBookings, savePhone, type SavedBooking } from "./storage";

export function MyBookings({ whatsapp }: { whatsapp?: string }) {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<MyBookingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedBooking[]>([]);

  useEffect(() => setSaved(readSavedBookings()), []);

  async function search(p: string) {
    setLoading(true);
    setError("");
    try {
      const data = await api<MyBookingsResponse>("/api/public/my-bookings", { body: { phone: p } });
      setPhone(p);
      setResult(data);
      savePhone(p);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "No pudimos buscar tus turnos. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const today = result?.today ?? localToday();
  const deviceOnly = useMemo(() => {
    const known = new Set([...(result?.upcoming ?? []), ...(result?.past ?? [])].map((b) => b.token));
    return saved
      .filter((s) => s.date >= today && !known.has(s.token))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }, [saved, result, today]);

  const [next, ...rest] = result?.upcoming ?? [];

  return (
    <PublicShell backHref="/" label="Mis turnos" whatsapp={whatsapp}>
      <header className="stagger mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="h-16 w-auto" />
        <h1
          className="font-gothic text-[clamp(2.75rem,15vw,3.75rem)] leading-none text-ink"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Mis turnos
        </h1>
        <p className="max-w-xs text-balance font-serif text-lg italic text-dim" style={{ "--i": 2 } as React.CSSProperties}>
          {result
            ? result.upcoming.length + result.past.length === 0
              ? "No encontramos turnos con este teléfono."
              : result.firstName
                ? `Hola, ${result.firstName}. Estos son tus turnos.`
                : "Estos son tus turnos."
            : "Ingresá tu teléfono y te mostramos tus reservas."}
        </p>
      </header>

      {!result ? (
        <Card className="animate-reveal p-5 [animation-delay:160ms]">
          <PhoneLookup onSubmit={search} loading={loading} error={error} submitLabel="Buscar mis turnos" autoFocus />
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card py-1 pl-4 pr-1 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-dim">
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate tabular-nums text-ink">{formatPhone(phone)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError("");
              }}
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 font-medium text-dim underline-offset-4 transition-colors hover:text-ink hover:underline active:bg-white/5"
            >
              Cambiar
            </button>
          </div>

          {next ? (
            <NextBooking booking={next} today={result.today} />
          ) : (
            <EmptyState title="No tenés turnos próximos" icon={<CalendarCheck2 className="h-8 w-8" />}>
              <p>Reservá en un minuto y elegí el horario que más te convenga.</p>
              <CtaLink href="/reservar" className="mt-4">
                Reservar nuevo turno
              </CtaLink>
            </EmptyState>
          )}

          {rest.length > 0 && (
            <Section title="También tenés">
              {rest.map((b, i) => (
                <BookingRow
                  key={b.token}
                  booking={b}
                  today={result.today}
                  cta={b.canModify ? "Cambiar o cancelar" : "Ver detalle"}
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </Section>
          )}

          {result.past.length > 0 && (
            <Section title="Turnos anteriores">
              {result.past.map((b, i) => (
                <BookingRow
                  key={b.token}
                  booking={b}
                  today={result.today}
                  isPast
                  cta="Ver detalle"
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {deviceOnly.length > 0 && (
        <Section title="Guardados en este dispositivo" className="mt-8">
          {deviceOnly.map((s, i) => (
            <DeviceRow key={s.token} entry={s} today={today} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </Section>
      )}

      {/* With no upcoming booking the empty state already carries this CTA: don't repeat it. */}
      {result && !next ? (
        <div className="mt-10 flex justify-center">
          <OrnamentDivider />
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-4">
          <OrnamentDivider />
          <CtaLink href="/reservar" size="lg" block>
            <CalendarCheck2 className="h-5 w-5" /> Reservar nuevo turno
          </CtaLink>
        </div>
      )}
    </PublicShell>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-dim">{title}</h2>
      <div className="stagger flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function NextBooking({ booking, today }: { booking: PublicBooking; today: string }) {
  const chip = dateChip(booking.date);
  return (
    <section aria-label="Tu próximo turno" className="animate-reveal">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-dim">Tu próximo turno</h2>
      <Link
        href={`/turno/${booking.token}`}
        className="group relative block overflow-hidden rounded-[22px] border border-ink/80 bg-card-2 p-4 min-[360px]:p-5 shadow-[0_20px_60px_-30px_rgba(255,255,255,0.35)] transition-[transform,border-color] duration-200 ease-out hover:border-ink active:scale-[0.985]"
      >
        <div className="pointer-events-none absolute -right-28 -top-28 opacity-[0.12]" aria-hidden="true">
          <HaloRays size={320} rays={44} className="animate-spin-slow" />
        </div>
        <div className="relative flex items-center gap-3.5 min-[360px]:gap-4">
          <div className="flex h-[76px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-bg min-[360px]:h-[84px] min-[360px]:w-[72px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{chip.day}</span>
            <span className="font-serif text-4xl font-semibold leading-none">{chip.num}</span>
            <span className="text-[11px] uppercase tracking-widest opacity-60">{chip.month}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-dim [overflow-wrap:anywhere]">{relativeDay(booking.date, today)}</p>
            <p className="whitespace-nowrap font-serif text-[2rem] font-semibold leading-none tabular-nums min-[360px]:text-4xl">
              {booking.start} hs
            </p>
            <p className="mt-1 truncate text-sm text-ink">
              {booking.serviceName}
              {booking.barberName ? <span className="text-dim"> · {booking.barberName}</span> : null}
            </p>
          </div>
        </div>
        {/* Wraps instead of truncating: on narrow phones the CTA drops to its own line. */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-dashed border-line-strong pt-3.5 text-sm">
          <span className="inline-flex min-w-0 items-start gap-1.5 text-dim">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="[overflow-wrap:anywhere]">{booking.branchName}</span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center font-semibold text-ink">
            {booking.canModify ? "Cambiar o cancelar" : "Ver detalle"}
            <ChevronRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}

function DeviceRow({ entry, today, style }: { entry: SavedBooking; today: string; style?: React.CSSProperties }) {
  const chip = dateChip(entry.date);
  return (
    <Link
      href={`/turno/${entry.token}`}
      style={style}
      className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong p-3 pr-3 transition-[transform,border-color] duration-200 ease-out hover:border-ink active:scale-[0.985] min-[360px]:gap-4 min-[360px]:pr-4"
    >
      <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">{chip.day}</span>
        <span className="font-serif text-xl font-semibold leading-none">{chip.num}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug [overflow-wrap:anywhere]">{relativeDay(entry.date, today)}</p>
        <p className="inline-flex items-center gap-1 text-sm text-dim">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {entry.start} hs
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center text-xs font-medium text-dim transition-colors group-hover:text-ink">
        <span className="hidden min-[400px]:inline">Cambiar o cancelar</span>
        <span className="min-[400px]:hidden">Ver</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
