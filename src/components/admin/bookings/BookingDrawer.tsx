"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  Globe,
  MessageCircle,
  Phone,
  RotateCcw,
  Scissors,
  Store,
  UserRound,
  UserX,
  X as XIcon,
} from "lucide-react";
import { Button, ErrorText, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatDateLong, formatDuration, formatPrice } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "./ConfirmButton";
import { Sheet } from "./Sheet";
import { SlotPicker } from "./SlotPicker";
import { StatusPill } from "./StatusPill";
import { firstName, stamp } from "./fmt";
import {
  BY_LABEL,
  HISTORY_LABEL,
  type AdminBooking,
  type BookingClientSummary,
  type BookingStatus,
} from "./types";

type Detail = { booking: AdminBooking; client: BookingClientSummary | null };

/**
 * Booking detail + actions. Status changes are optimistic: `onChange` gets the predicted booking
 * immediately, then the server's version (or the original one back if the request fails).
 */
export function BookingDrawer({
  booking: initial,
  open,
  onClose,
  onChange,
  currency = "ARS",
  businessName = "Ram Hair Studio",
  today,
}: {
  booking: AdminBooking | null;
  open: boolean;
  onClose: () => void;
  onChange?: (b: AdminBooking) => void;
  currency?: string;
  businessName?: string;
  today?: string;
}) {
  const [booking, setBooking] = useState<AdminBooking | null>(initial);
  const [client, setClient] = useState<BookingClientSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rescheduling, setRescheduling] = useState(false);

  const id = initial?._id;

  // Reset local state whenever a different booking is opened.
  useEffect(() => {
    if (!open || !initial) return;
    setBooking(initial);
    setNotes(initial.notes);
    setError(null);
    setRescheduling(false);
    setClient(null);
    const ctrl = new AbortController();
    api<Detail>(`/api/admin/bookings/${initial._id}`, { signal: ctrl.signal })
      .then((d) => {
        setBooking(d.booking);
        setNotes(d.booking.notes);
        setClient(d.client);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  // Pick up background refreshes of the same booking (e.g. agenda auto-refresh).
  useEffect(() => {
    if (open && initial && booking && initial._id === booking._id && initial.updatedAt > booking.updatedAt) {
      setBooking(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.updatedAt]);

  const commit = useCallback(
    (b: AdminBooking) => {
      setBooking(b);
      onChange?.(b);
    },
    [onChange],
  );

  async function setStatus(next: BookingStatus) {
    if (!booking) return;
    const prev = booking;
    setError(null);
    setBusy(next);
    commit({ ...prev, status: next, active: next !== "cancelled" });
    try {
      const r = await api<{ booking: AdminBooking }>(`/api/admin/bookings/${prev._id}`, {
        method: "PATCH",
        body: { status: next },
      });
      commit(r.booking);
    } catch (e) {
      commit(prev);
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    if (!booking) return;
    setError(null);
    setBusy("notes");
    try {
      const r = await api<{ booking: AdminBooking }>(`/api/admin/bookings/${booking._id}`, {
        method: "PATCH",
        body: { notes },
      });
      commit(r.booking);
      setNotes(r.booking.notes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const b = booking;
  const notesDirty = b ? notes.trim() !== b.notes : false;

  const reminder = b
    ? `Hola ${firstName(b.clientName) || ""}! Te recordamos tu turno en ${businessName} el ${formatDateLong(b.date).toLowerCase()} a las ${b.start}.`.replace(
        "Hola !",
        "Hola!",
      )
    : "";

  const footer =
    b && !rescheduling ? (
      <div className="flex flex-wrap gap-2">
        {b.status === "confirmed" ? (
          <>
            <Button size="sm" onClick={() => setStatus("completed")} loading={busy === "completed"} disabled={!!busy}>
              <Check className="h-4 w-4" aria-hidden="true" /> Asistió
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus("no_show")}
              loading={busy === "no_show"}
              disabled={!!busy}
            >
              <UserX className="h-4 w-4" aria-hidden="true" /> No vino
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRescheduling(true)} disabled={!!busy}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Reprogramar
            </Button>
            <ConfirmButton
              size="sm"
              variant="ghost"
              className="ml-auto"
              onConfirm={() => setStatus("cancelled")}
              loading={busy === "cancelled"}
              disabled={!!busy}
              confirmLabel="¿Cancelar turno?"
            >
              <XIcon className="h-4 w-4" aria-hidden="true" /> Cancelar
            </ConfirmButton>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus("confirmed")}
              loading={busy === "confirmed"}
              disabled={!!busy}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restaurar
            </Button>
            {b.status === "no_show" && (
              <Button size="sm" onClick={() => setStatus("completed")} loading={busy === "completed"} disabled={!!busy}>
                <Check className="h-4 w-4" aria-hidden="true" /> Asistió
              </Button>
            )}
            {b.status === "completed" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatus("no_show")}
                loading={busy === "no_show"}
                disabled={!!busy}
              >
                <UserX className="h-4 w-4" aria-hidden="true" /> No vino
              </Button>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={b ? b.clientName || formatPhone(b.clientPhone) : "Turno"}
      subtitle={
        b ? (
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={b.status} />
            <span className="tabular-nums">
              {b.start}–{b.end}
            </span>
            <span aria-hidden="true">·</span>
            <span>{today && b.date === today ? "Hoy" : formatDateLong(b.date)}</span>
          </span>
        ) : null
      }
      footer={footer}
    >
      {b && (
        <div className="flex flex-col gap-6">
          <ErrorText>{error}</ErrorText>

          {rescheduling ? (
            <Reschedule
              booking={b}
              onCancel={() => setRescheduling(false)}
              onDone={(nb) => {
                commit(nb);
                setRescheduling(false);
              }}
            />
          ) : (
            <>
              {/* Client */}
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsappLink(b.clientPhone, reminder)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-semibold text-bg transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Recordatorio
                  </a>
                  <a
                    href={`tel:+549${b.clientPhone}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold transition-[transform,border-color] duration-150 ease-out hover:border-ink active:scale-[0.97]"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" /> {formatPhone(b.clientPhone)}
                  </a>
                  <Link
                    href={`/admin/clientes/${b.clientId}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-dim transition-colors hover:bg-white/5 hover:text-ink"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" /> Ficha
                  </Link>
                </div>
                {client ? (
                  <ClientStrip client={client} />
                ) : (
                  <div className="h-[58px] animate-pulse rounded-2xl border border-line bg-surface" aria-hidden="true" />
                )}
              </section>

              {/* Service */}
              <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
                <Info icon={Scissors} label="Servicio" value={b.serviceName} />
                <Info icon={UserRound} label="Barbero" value={b.barberName} />
                <Info icon={Clock} label="Duración" value={formatDuration(b.durationMin)} />
                <Info icon={Store} label="Sucursal" value={b.branchName} />
                <div className="col-span-2 flex items-end justify-between gap-3 bg-card px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Precio</p>
                    <p className="mt-0.5 flex flex-wrap items-baseline gap-2">
                      <span className="text-xl font-semibold tabular-nums">{formatPrice(b.finalPrice, currency)}</span>
                      {b.discountPercent > 0 && (
                        <>
                          <span className="text-sm text-faint line-through tabular-nums">
                            {formatPrice(b.price, currency)}
                          </span>
                          <span className="text-xs text-dim">−{b.discountPercent}%</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-dim">
                    {b.membershipApplied || (b.discountPercent === 100 && b.includedInPlan) ? (
                      <span className="inline-flex items-center gap-1 text-ink">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Membresía
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                      {b.source === "web" ? "Reservó online" : "Cargado en panel"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section className="flex flex-col gap-2">
                <label htmlFor="booking-notes" className="text-xs font-medium uppercase tracking-[0.14em] text-dim">
                  Notas
                </label>
                <Textarea
                  id="booking-notes"
                  value={notes}
                  maxLength={500}
                  placeholder="Ej: degradé bajo, trae a su hijo…"
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && notesDirty) saveNotes();
                  }}
                  className="min-h-20 text-sm"
                />
                <div
                  className={cn(
                    "flex items-center justify-end gap-2 transition-opacity duration-150",
                    notesDirty ? "opacity-100" : "pointer-events-none opacity-0",
                  )}
                  aria-hidden={!notesDirty}
                >
                  <Button size="sm" variant="ghost" onClick={() => setNotes(b.notes)} tabIndex={notesDirty ? 0 : -1}>
                    Descartar
                  </Button>
                  <Button size="sm" variant="subtle" onClick={saveNotes} loading={busy === "notes"} tabIndex={notesDirty ? 0 : -1}>
                    Guardar notas
                  </Button>
                </div>
              </section>

              {/* History */}
              {b.history?.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Historial</h3>
                  <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
                    {[...b.history].reverse().map((h, i) => (
                      <li key={i} className="relative text-sm">
                        <span
                          className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-line-strong bg-card"
                          aria-hidden="true"
                        />
                        <p className="text-ink">
                          {HISTORY_LABEL[h.action] ?? h.action}
                          {h.by && <span className="text-faint"> · {BY_LABEL[h.by] ?? h.by}</span>}
                        </p>
                        <p className="text-xs text-faint">
                          {stamp(h.at)}
                          {h.detail && h.action !== "notes" ? ` · ${h.detail}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">
        <Icon className="h-3 w-3" aria-hidden="true" /> {label}
      </p>
      <p className="mt-0.5 truncate font-medium">{value || "—"}</p>
    </div>
  );
}

function ClientStrip({ client }: { client: BookingClientSummary }) {
  const s = client.stats;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm animate-fade">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-dim">
        <span>
          <b className="font-semibold text-ink tabular-nums">{s.completed}</b> visitas
        </span>
        <span>
          <b className={cn("font-semibold tabular-nums", s.noShows ? "text-warn" : "text-ink")}>{s.noShows}</b> no vino
        </span>
        {client.loyalty.enabled && (
          <span>
            Tarjeta{" "}
            <b className="font-semibold text-ink tabular-nums">
              {client.loyalty.stamps}/{client.loyalty.cardSize}
            </b>
          </span>
        )}
        {client.loyalty.pendingGifts > 0 && <span className="text-warn">Regalo pendiente</span>}
      </div>
      {client.member && (
        <p className="inline-flex items-center gap-1.5 text-xs text-ink">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {client.member.planName} · {client.member.cutsRemaining} cortes · vence {client.member.validUntil}
        </p>
      )}
      {client.notes && <p className="text-xs text-dim">“{client.notes}”</p>}
    </div>
  );
}

function Reschedule({
  booking,
  onCancel,
  onDone,
}: {
  booking: AdminBooking;
  onCancel: () => void;
  onDone: (b: AdminBooking) => void;
}) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSlot = useCallback((t: string) => setTime(t), []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ booking: AdminBooking }>(`/api/admin/bookings/${booking._id}`, {
        method: "PATCH",
        body: { date, start: time },
      });
      onDone(r.booking);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 animate-fade">
      <div>
        <h3 className="font-semibold">Reprogramar</h3>
        <p className="text-sm text-dim">
          Mismo barbero ({booking.barberName}) y servicio. Actual: {formatDateLong(booking.date)} {booking.start}.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="resched-date" className="text-xs font-medium uppercase tracking-[0.14em] text-dim">
          Fecha
        </label>
        <Input id="resched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
      </div>
      <SlotPicker
        branchId={booking.branchId}
        serviceId={booking.serviceId}
        barberId={booking.barberId}
        date={date}
        excludeBookingId={booking._id}
        value={time}
        onChange={onSlot}
        disabledTime={date === booking.date ? booking.start : undefined}
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={!time} loading={busy}>
          {time ? `Mover a ${time}` : "Elegí un horario"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
      </div>
    </section>
  );
}
