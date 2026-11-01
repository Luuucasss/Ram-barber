"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  Check,
  Copy,
  MapPin,
  Navigation,
  RefreshCw,
  Scissors,
  Share2,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { HaloRays, Rose } from "@/components/ornaments";
import { PublicShell, WhatsAppIcon } from "@/components/public/PublicShell";
import { Button, ErrorText, Modal, Pill } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";
import { dateChip, formatDuration, formatPrice, googleCalendarLink, relativeDay } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { BookingPayload } from "@/app/api/public/booking/[token]/_shared";
import { CtaLink } from "./CtaLink";
import { Reschedule } from "./Reschedule";
import { STATE_PILL, bookingState, type BookingState } from "./status";
import { removeSavedBooking, upsertSavedBooking } from "./storage";

type Load =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: BookingPayload };

type Flash = { title: string; body: string } | null;

export function ManageBooking({ token }: { token: string }) {
  const [state, setState] = useState<Load>({ kind: "loading" });
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [flash, setFlash] = useState<Flash>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await api<BookingPayload>(`/api/public/booking/${encodeURIComponent(token)}`);
      setState({ kind: "ready", data });
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) setState({ kind: "not_found" });
      else setState({ kind: "error", message: e instanceof ApiClientError ? e.message : "No pudimos cargar el turno." });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the device-local list ("Mis turnos") in sync with what the server says.
  useEffect(() => {
    if (state.kind !== "ready") return;
    const b = state.data.booking;
    if (b.status === "cancelled") removeSavedBooking(b.token);
    else if (b.status === "confirmed" && state.data.minutesUntil > -24 * 60)
      upsertSavedBooking({ token: b.token, date: b.date, start: b.start });
  }, [state]);

  const whatsapp = state.kind === "ready" ? state.data.whatsapp : undefined;

  return (
    <PublicShell backHref="/mis-turnos" label="Tu turno" whatsapp={whatsapp}>
      {state.kind === "loading" && <TicketSkeleton />}
      {state.kind === "not_found" && <NotFound />}
      {state.kind === "error" && (
        <div className="flex flex-col gap-4 pt-10">
          <ErrorText>{state.message}</ErrorText>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      )}
      {state.kind === "ready" && (
        <Ready
          token={token}
          data={state.data}
          mode={mode}
          flash={flash}
          onReschedule={() => {
            setFlash(null);
            setMode("reschedule");
          }}
          onCloseReschedule={() => setMode("view")}
          onRescheduled={(next) => {
            setState({ kind: "ready", data: next });
            setMode("view");
            setFlash({
              title: "¡Listo! Cambiamos tu turno",
              body: `Te esperamos ${relativeDay(next.booking.date, next.today).toLowerCase()} a las ${next.booking.start} hs.`,
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onCancel={() => {
            setFlash(null);
            setCancelError("");
            setCancelOpen(true);
          }}
        />
      )}

      {state.kind === "ready" && (
        <Modal open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} title="¿Cancelar tu turno?">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-dim">
              Vas a cancelar <span className="text-ink">{state.data.booking.serviceName}</span>:{" "}
              <span className="text-ink">
                {relativeDay(state.data.booking.date, state.data.today).toLowerCase()} a las {state.data.booking.start} hs
              </span>
              . El horario queda libre para otra persona.
            </p>
            <ErrorText>{cancelError}</ErrorText>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="border-ink"
                size="lg"
                block
                loading={cancelling}
                onClick={async () => {
                  setCancelling(true);
                  setCancelError("");
                  try {
                    const next = await api<BookingPayload>(`/api/public/booking/${encodeURIComponent(token)}/cancel`, {
                      method: "POST",
                      body: {},
                    });
                    setState({ kind: "ready", data: next });
                    setCancelOpen(false);
                    setMode("view");
                    setFlash({
                      title: "Listo, cancelamos tu turno",
                      body: "Cuando quieras, reservá uno nuevo.",
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } catch (e) {
                    setCancelError(e instanceof ApiClientError ? e.message : "No pudimos cancelar. Probá de nuevo.");
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                Sí, cancelar turno
              </Button>
              <Button variant="ghost" block disabled={cancelling} onClick={() => setCancelOpen(false)}>
                No, mantener mi turno
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PublicShell>
  );
}

/* ------------------------------------------------------------------ */

const HEADLINES: Record<BookingState, { title: string; body: (d: BookingPayload) => string }> = {
  upcoming: {
    title: "Te esperamos",
    body: (d) => `${relativeDay(d.booking.date, d.today)} a las ${d.booking.start} hs. Llegá unos minutos antes.`,
  },
  soon: {
    title: "Tu turno es en un rato",
    body: (d) => `Hoy a las ${d.booking.start} hs. ¡Te esperamos!`,
  },
  past: {
    title: "Este turno ya pasó",
    body: () => "¿Volvemos a vernos? Reservá tu próximo corte en un minuto.",
  },
  cancelled: {
    title: "Turno cancelado",
    body: () => "El horario ya quedó libre. Si querés, podés reservar otro cuando quieras.",
  },
  completed: {
    title: "¡Gracias por venir!",
    body: () => "Tu corte ya suma en tu tarjeta de fidelidad.",
  },
  no_show: {
    title: "Te estuvimos esperando",
    body: () => "Este turno quedó como ausente. Si querés, reservá uno nuevo.",
  },
};

function Ready({
  token,
  data,
  mode,
  flash,
  onReschedule,
  onCloseReschedule,
  onRescheduled,
  onCancel,
}: {
  token: string;
  data: BookingPayload;
  mode: "view" | "reschedule";
  flash: Flash;
  onReschedule: () => void;
  onCloseReschedule: () => void;
  onRescheduled: (next: BookingPayload) => void;
  onCancel: () => void;
}) {
  const { booking } = data;
  const state = bookingState(booking.status, { minutesUntil: data.minutesUntil });
  const pill = STATE_PILL[state];
  const head = HEADLINES[state];
  const active = state === "upcoming" || state === "soon";
  const tooLate = active && !data.canModify && data.reason === "too_late";

  return (
    <div className="flex flex-col gap-5">
      {flash && <FlashBanner key={flash.title + booking.date + booking.start} {...flash} />}

      {/* Hero */}
      <header className="stagger flex flex-col items-center gap-3 pt-2 text-center">
        <Pill tone={pill.tone} className={pill.className} style={{ "--i": 0 } as React.CSSProperties}>
          {active && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
            </span>
          )}
          {pill.label}
        </Pill>
        <h1
          className="max-w-full text-balance break-words font-gothic text-[clamp(2.4rem,12.5vw,3rem)] leading-[0.95] text-ink sm:text-6xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {head.title}
          {booking.clientName && active ? (
            <span className="mt-1 block truncate font-serif text-2xl italic text-dim">{booking.clientName}</span>
          ) : null}
        </h1>
        <p className="max-w-sm text-balance font-serif text-lg italic text-dim" style={{ "--i": 2 } as React.CSSProperties}>
          {head.body(data)}
        </p>
      </header>

      <Ticket data={data} state={state} />

      {active && mode === "view" && <QuickLinks data={data} />}

      {mode === "reschedule" && data.canModify ? (
        <Reschedule token={token} data={data} onDone={onRescheduled} onClose={onCloseReschedule} />
      ) : (
        <Actions data={data} state={state} tooLate={tooLate} onReschedule={onReschedule} onCancel={onCancel} />
      )}
    </div>
  );
}

function FlashBanner({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="status"
      className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-ink/70 bg-card-2 p-4 animate-reveal [animation-duration:450ms]"
    >
      <span className="grid h-10 w-10 shrink-0 animate-pop place-items-center rounded-full bg-ink text-bg [animation-delay:120ms]">
        <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="relative z-10 min-w-0 pr-8">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-dim">{body}</p>
      </div>
      <Rose size={90} tone="dark" className="pointer-events-none absolute -right-8 -top-6 opacity-20" />
    </div>
  );
}

function Ticket({ data, state }: { data: BookingPayload; state: BookingState }) {
  const { booking, branch } = data;
  const chip = dateChip(booking.date);
  const muted = state === "cancelled" || state === "no_show" || state === "past";
  const hasDiscount = booking.discountPercent > 0 && !booking.membershipApplied && booking.finalPrice < booking.price;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[22px] border bg-card animate-reveal [animation-delay:180ms]",
        muted ? "border-line" : "border-line-strong",
      )}
    >
      {/* Halo watermark */}
      <div className="pointer-events-none absolute -right-24 -top-24 opacity-[0.08]" aria-hidden="true">
        <HaloRays size={300} rays={40} className={state === "upcoming" || state === "soon" ? "animate-spin-slow" : ""} />
      </div>

      {/* Date + time */}
      <div className="relative flex items-center gap-3.5 p-4 min-[360px]:gap-4 min-[360px]:p-5">
        <div
          className={cn(
            "flex h-[80px] w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl border min-[360px]:h-[88px] min-[360px]:w-[76px]",
            muted ? "border-line text-dim" : "border-ink bg-ink text-bg",
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{chip.day}</span>
          <span className="font-serif text-4xl font-semibold leading-none">{chip.num}</span>
          <span className="text-[11px] uppercase tracking-widest opacity-60">{chip.month}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-faint">
            {relativeDay(booking.date, data.today)}
          </p>
          <p
            className={cn(
              "font-serif text-[2.6rem] font-semibold leading-none tabular-nums min-[360px]:text-5xl",
              muted && "text-dim line-through decoration-1",
            )}
          >
            {booking.start}
          </p>
          <p className="mt-1 text-sm text-dim">
            hasta las {booking.end} · {formatDuration(booking.durationMin)}
          </p>
        </div>
      </div>

      {/* Perforation */}
      <div className="relative flex items-center" aria-hidden="true">
        <span className="absolute -left-3 h-6 w-6 rounded-full border border-line bg-bg" />
        <span className="mx-5 h-px flex-1 border-t border-dashed border-line-strong" />
        <span className="absolute -right-3 h-6 w-6 rounded-full border border-line bg-bg" />
      </div>

      <dl className="relative grid gap-3.5 p-4 text-sm min-[360px]:p-5">
        <Row icon={<Scissors className="h-4 w-4" />} label="Servicio" value={booking.serviceName} />
        <Row icon={<User className="h-4 w-4" />} label="Barbero" value={booking.barberName || "A confirmar"} />
        <Row
          icon={<MapPin className="h-4 w-4" />}
          label="Sucursal"
          value={
            <>
              {branch.name || booking.branchName}
              {branch.address && <span className="block text-xs text-dim">{branch.address}</span>}
            </>
          }
        />
        <Row
          icon={<Tag className="h-4 w-4" />}
          label="Precio"
          value={
            booking.membershipApplied ? (
              <span className="inline-flex items-center gap-2">
                Incluido en tu plan <Pill tone="ink" className="py-0 text-[10px]">Socio</Pill>
              </span>
            ) : hasDiscount ? (
              <span className="inline-flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{formatPrice(booking.finalPrice, data.currency)}</span>
                <span className="text-xs text-faint line-through">{formatPrice(booking.price, data.currency)}</span>
                <Pill tone="neutral" className="border-ink py-0 text-[10px] text-ink">
                  {booking.discountPercent}% OFF
                </Pill>
              </span>
            ) : (
              formatPrice(booking.finalPrice || booking.price, data.currency)
            )
          }
        />
      </dl>
    </article>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-faint" aria-hidden="true">
        {icon}
      </span>
      <dt className="w-[4.5rem] shrink-0 text-dim min-[360px]:w-20">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function QuickLinks({ data }: { data: BookingPayload }) {
  const { booking, branch } = data;
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const mapsUrl =
    branch.mapsUrl ||
    (branch.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.address} ${branch.name}`)}`
      : "");
  const calUrl = googleCalendarLink({
    title: `${booking.serviceName} · Ram Hair Studio`,
    date: booking.date,
    start: booking.start,
    end: booking.end,
    details: `Con ${booking.barberName || "tu barbero"}.${url ? `\nCambiar o cancelar: ${url}` : ""}`,
    location: branch.address || branch.name,
    timezone: data.timezone,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: nothing else to do */
    }
  }

  async function share() {
    const link = url || window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Mi turno · Ram Hair Studio",
          text: `${booking.serviceName} — ${relativeDay(booking.date, data.today)} a las ${booking.start} hs`,
          url: link,
        });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  const tile =
    "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-card px-1.5 py-3.5 text-center text-xs font-medium leading-tight text-dim transition-[transform,border-color,color] duration-150 ease-out hover:border-line-strong hover:text-ink active:scale-[0.96]";

  return (
    <div className="flex flex-col gap-2.5">
      {/* No address configured → no dead "Cómo llegar" tile; the other two share the row. */}
      <div className={cn("grid gap-2 min-[360px]:gap-2.5", mapsUrl ? "grid-cols-3" : "grid-cols-2")}>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={tile}>
            <Navigation className="h-5 w-5 text-ink" aria-hidden="true" />
            Cómo llegar
          </a>
        )}
        <a href={calUrl} target="_blank" rel="noopener noreferrer" className={tile}>
          <CalendarPlus className="h-5 w-5 text-ink" aria-hidden="true" />
          <span className="text-center leading-tight">
            Agregar a <br className="sm:hidden" />
            Google Calendar
          </span>
        </a>
        <button type="button" onClick={share} className={tile}>
          <Share2 className="h-5 w-5 text-ink" aria-hidden="true" />
          Compartir
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line py-2.5 pl-4 pr-2.5">
        <p className="min-w-0 flex-1 text-xs text-dim">Guardá este link: desde acá podés cambiar o cancelar tu turno.</p>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Link copiado" : "Copiar link"}
          className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-line-strong px-3 text-xs font-semibold text-ink transition-[transform,border-color] duration-150 ease-out hover:border-ink active:scale-[0.96]"
        >
          <span className="relative h-4 w-4" aria-hidden="true">
            <Copy
              className={cn(
                "absolute inset-0 h-4 w-4 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100 blur-0",
              )}
            />
            <Check
              className={cn(
                "absolute inset-0 h-4 w-4 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                copied ? "scale-100 opacity-100 blur-0" : "scale-50 opacity-0 blur-[2px]",
              )}
            />
          </span>
          <span aria-live="polite">{copied ? "Copiado" : "Copiar link"}</span>
        </button>
      </div>
    </div>
  );
}

function Actions({
  data,
  state,
  tooLate,
  onReschedule,
  onCancel,
}: {
  data: BookingPayload;
  state: BookingState;
  tooLate: boolean;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const { booking } = data;

  if (data.canModify) {
    return (
      <div className="flex flex-col gap-2.5">
        <Button size="lg" block onClick={onReschedule}>
          <CalendarClock className="h-5 w-5" /> Reprogramar
        </Button>
        <Button variant="outline" size="lg" block onClick={onCancel}>
          <XCircle className="h-5 w-5" /> Cancelar turno
        </Button>
        <p className="mt-1 text-center text-xs text-faint">
          Podés cambiar o cancelar online hasta {hoursText(data.cancelLimitHours)} antes del turno.
        </p>
      </div>
    );
  }

  if (tooLate) {
    const msg = `¡Hola! Tengo un turno ${relativeDay(booking.date, data.today).toLowerCase()} a las ${booking.start} (${booking.serviceName}${booking.barberName ? ` con ${booking.barberName}` : ""}) y necesito cambiarlo o cancelarlo.`;
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card p-5">
        <p className="font-semibold text-ink">Ya no se puede cambiar online</p>
        <p className="text-sm text-dim">
          Los turnos se pueden cambiar o cancelar hasta {hoursText(data.cancelLimitHours)} antes. Si te surgió algo,
          escribinos y lo resolvemos.
        </p>
        <CtaLink href={whatsappLink(data.whatsapp, msg)} external variant="outline" size="lg" block>
          <WhatsAppIcon className="h-5 w-5" /> Escribir por WhatsApp
        </CtaLink>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div className="flex flex-col gap-2.5">
        <CtaLink href="/fidelidad" size="lg" block>
          <Rose size={22} tone="dark" /> Ver mi tarjeta de fidelidad
        </CtaLink>
        <CtaLink href="/reservar" variant="outline" size="lg" block>
          <CalendarCheck2 className="h-5 w-5" /> Reservar nuevo turno
        </CtaLink>
      </div>
    );
  }

  if (state === "past" || state === "cancelled" || state === "no_show") {
    return (
      <div className="flex flex-col gap-2.5">
        <CtaLink href="/reservar" size="lg" block>
          <CalendarCheck2 className="h-5 w-5" /> {state === "past" ? "¿Volvemos a vernos?" : "Reservar nuevo turno"}
        </CtaLink>
        <CtaLink href="/mis-turnos" variant="ghost" block>
          Ver mis turnos
        </CtaLink>
      </div>
    );
  }

  return null;
}

function hoursText(h: number) {
  if (h <= 0) return "el momento";
  if (h < 1) return `${Math.round(h * 60)} minutos`;
  return h === 1 ? "1 hora" : `${h} horas`;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-5 pt-12 text-center animate-reveal">
      {/* Halo sized/offset so it stays clear of the shell header; text is positioned so it paints above it. */}
      <div className="relative grid place-items-center">
        <HaloRays
          size={200}
          rays={36}
          className="pointer-events-none absolute animate-spin-slow opacity-20"
        />
        <Rose size={96} tone="light" className="relative" />
      </div>
      <h1 className="relative text-balance font-gothic text-[clamp(2.4rem,12.5vw,3rem)] leading-none">
        No encontramos este turno
      </h1>
      <p className="relative max-w-xs text-balance font-serif text-lg italic text-dim">
        Puede que el link esté incompleto o que sea de otro turno. Buscalo con tu teléfono.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2.5">
        <CtaLink href="/mis-turnos" size="lg" block>
          Buscar mis turnos
        </CtaLink>
        <CtaLink href="/reservar" variant="outline" size="lg" block>
          Reservar nuevo turno
        </CtaLink>
      </div>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando turno">
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="h-5 w-24 animate-pulse rounded-full bg-card-2" />
        <div className="h-12 w-56 animate-pulse rounded-xl bg-card-2" />
        <div className="h-5 w-64 animate-pulse rounded-lg bg-card" />
      </div>
      <div className="h-72 animate-pulse rounded-[22px] border border-line bg-card" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}
