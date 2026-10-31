"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, MessageCircle, Phone } from "lucide-react";
import { BookingDrawer } from "@/components/admin/bookings/BookingDrawer";
import { NewBookingSheet } from "@/components/admin/bookings/NewBookingSheet";
import { StatusPill } from "@/components/admin/bookings/StatusPill";
import { firstName, numericDate, shortDate, sinceDays } from "@/components/admin/bookings/fmt";
import type { AdminBooking } from "@/components/admin/bookings/types";
import { Button, Card, EmptyState, ErrorText, Field, Input, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { LoyaltyPanel } from "./LoyaltyPanel";
import { MembershipPanel, type MembershipBody } from "./MembershipPanel";
import type { ClientDetailData } from "./types";

export function ClientDetail({ id }: { id: string }) {
  const [data, setData] = useState<ClientDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const apply = useCallback((d: ClientDetailData) => {
    setData(d);
    setName(d.client.name);
    setNotes(d.client.notes);
  }, []);

  const ctrl = useRef<AbortController | null>(null);
  const load = useCallback(
    async (silent = false) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      try {
        const d = await api<ClientDetailData>(`/api/admin/clients/${id}`, { signal: c.signal });
        // Silent refreshes keep whatever the user is typing in the profile form.
        if (silent) setData(d);
        else apply(d);
        setError(null);
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.name === "AbortError") return;
        if (err.status === 404) setNotFound(true);
        else setError(err.message);
      }
    },
    [id, apply],
  );

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);

  const phone = data?.client.phone;
  const clientName = data?.client.name;
  const preset = useMemo(() => (phone ? { phone, name: clientName ?? "" } : null), [phone, clientName]);

  async function run<T extends object>(tag: string, url: string, method: string, body: T) {
    setBusy(tag);
    setError(null);
    try {
      const d = await api<ClientDetailData>(url, { method, body });
      if (tag === "profile") apply(d);
      else setData(d); // keep unsaved profile edits intact
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <EmptyState title="No encontramos este cliente" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        {error ? <ErrorText>{error}</ErrorText> : <Spinner label="Cargando cliente…" />}
      </div>
    );
  }

  const c = data.client;
  const s = c.stats;
  const profileDirty = name.trim() !== c.name || notes.trim() !== c.notes;
  const currency = data.settings.currency;
  const greeting = `Hola ${firstName(c.name)}!`.replace("Hola !", "Hola!");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{c.name || "Sin nombre"}</h1>
            <p className="mt-1 text-sm tabular-nums text-dim">
              {formatPhone(c.phone)} · cliente desde {numericDate(c.createdAt.slice(0, 10))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsappLink(c.phone, greeting)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold transition-[transform,border-color] duration-150 ease-out hover:border-ink active:scale-[0.97]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
            <a
              href={`tel:+549${c.phone}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold transition-[transform,border-color] duration-150 ease-out hover:border-ink active:scale-[0.97]"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> Llamar
            </a>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Nuevo turno
            </Button>
          </div>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-5">
        {[
          ["Turnos", s.bookings],
          ["Visitas", s.completed],
          ["Cancelados", s.cancelled],
          ["No vino", s.noShows],
          ["Última visita", sinceDays(c.lastVisitAt, data.today)],
        ].map(([label, value], i) => (
          <div key={label} className={cn("bg-card px-4 py-3", i === 4 && "col-span-2 sm:col-span-1")}>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-faint">{label}</dt>
            <dd
              className={cn(
                "mt-1 font-semibold tabular-nums leading-tight",
                typeof value === "number" ? "text-2xl" : "text-base",
                label === "No vino" && Number(value) > 0 && "text-warn",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {/* Profile */}
          <Card className="p-5">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (profileDirty) run("profile", `/api/admin/clients/${id}`, "PATCH", { name: name.trim(), notes: notes.trim() });
              }}
            >
              <h2 className="font-semibold">Datos</h2>
              <Field label="Nombre">
                {(fid) => (
                  <Input id={fid} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-11" />
                )}
              </Field>
              <Field label="Notas internas" hint="Preferencias, alergias, cómo le gusta el corte… Solo lo ve el equipo.">
                {(fid) => (
                  <Textarea
                    id={fid}
                    value={notes}
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-24 text-sm"
                  />
                )}
              </Field>
              <div
                className={cn(
                  "flex justify-end gap-2 transition-opacity duration-150",
                  profileDirty ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                aria-hidden={!profileDirty}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  tabIndex={profileDirty ? 0 : -1}
                  onClick={() => {
                    setName(c.name);
                    setNotes(c.notes);
                  }}
                >
                  Descartar
                </Button>
                <Button type="submit" size="sm" loading={busy === "profile"} tabIndex={profileDirty ? 0 : -1}>
                  Guardar
                </Button>
              </div>
            </form>
          </Card>

          {/* History */}
          <section className="flex flex-col gap-3">
            <h2 className="flex items-baseline justify-between font-semibold">
              Historial de turnos
              {data.bookings.length >= 50 && <span className="text-xs font-normal text-faint">últimos 50</span>}
            </h2>
            {data.bookings.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
                {data.bookings.map((b) => (
                  <li key={b._id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(b);
                        setDrawerOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-card-2"
                    >
                      <div className="w-20 shrink-0 tabular-nums">
                        <p className="text-sm font-medium">{b.date === data.today ? "Hoy" : shortDate(b.date)}</p>
                        <p className="text-xs text-faint">{b.start}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm", b.status === "cancelled" && "text-dim line-through")}>
                          {b.serviceName}
                        </p>
                        <p className="truncate text-xs text-dim">
                          {b.barberName} · {formatPrice(b.finalPrice, currency)}
                          {b.membershipApplied && " · membresía"}
                        </p>
                      </div>
                      <StatusPill status={b.status} className="shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin turnos todavía" />
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <LoyaltyPanel
            loyalty={data.loyalty}
            redemptions={c.loyalty.redemptions ?? []}
            busy={busy}
            onAdjust={(delta) =>
              run(`adjust:${delta}`, `/api/admin/clients/${id}/loyalty`, "POST", { action: "adjust", delta })
            }
            onDeliver={(redemptionId) =>
              run(`deliver:${redemptionId}`, `/api/admin/clients/${id}/loyalty`, "POST", {
                action: "deliver",
                redemptionId,
              })
            }
          />
          <MembershipPanel
            membership={c.membership}
            plans={data.plans}
            enabled={data.settings.membershipEnabled}
            today={data.today}
            currency={currency}
            busy={busy}
            onSave={(body: MembershipBody, tag) => run(tag, `/api/admin/clients/${id}/membership`, "PUT", body)}
          />
        </div>
      </div>

      <BookingDrawer
        booking={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChange={(b) => {
          setSelected(b);
          setData((d) => (d ? { ...d, bookings: d.bookings.map((x) => (x._id === b._id ? b : x)) } : d));
          // Stats, stamps and membership cuts move with status changes: refresh them quietly.
          load(true);
        }}
        currency={currency}
        businessName={data.settings.businessName}
        today={data.today}
      />
      <NewBookingSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        defaultDate={data.today}
        preset={preset}
        onCreated={() => load(true)}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/clientes"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-dim transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clientes
    </Link>
  );
}
