"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Loader2, UserCheck } from "lucide-react";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatDuration, formatPrice } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { Sheet } from "./Sheet";
import { SlotPicker } from "./SlotPicker";
import type { AdminBooking } from "./types";
import { barberDoesService, serviceInBranch, useCatalog } from "./useCatalog";

export type NewBookingPreset = {
  date?: string;
  barberId?: string;
  branchId?: string;
  start?: string;
  phone?: string;
  name?: string;
};

type KnownClient = {
  _id: string;
  name: string;
  stats: { bookings: number; completed: number; noShows: number };
  stamps: number;
  cardSize: number;
  member: boolean;
};

const emptyForm = { phone: "", name: "", notes: "", serviceId: "", barberId: "any", start: "" };

/** Walk-in / phone booking form. Autofills the client name from the phone on blur. */
export function NewBookingSheet({
  open,
  onClose,
  onCreated,
  preset,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (b: AdminBooking) => void;
  preset?: NewBookingPreset | null;
  defaultDate: string;
}) {
  const { catalog } = useCatalog();
  const [form, setForm] = useState(emptyForm);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [known, setKnown] = useState<KnownClient | null>(null);
  const [lookup, setLookup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const lastLookup = useRef("");

  const branches = useMemo(() => catalog?.branches.filter((b) => b.active) ?? [], [catalog]);

  // Reset on every open, applying the preset (e.g. a click on an empty agenda cell).
  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      phone: preset?.phone ?? "",
      name: preset?.name ?? "",
      barberId: preset?.barberId ?? "any",
      start: preset?.start ?? "",
    });
    setDate(preset?.date ?? defaultDate);
    setKnown(null);
    setError(null);
    setPhoneError(null);
    lastLookup.current = "";
    // Skip focusing on touch screens: popping the keyboard hides half the sheet.
    const fine = window.matchMedia("(pointer: fine)").matches;
    const t = setTimeout(() => !preset?.phone && fine && phoneRef.current?.focus(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !catalog) return;
    const fromBarber = preset?.barberId && catalog.barbers.find((b) => b._id === preset.barberId)?.branchId;
    setBranchId(preset?.branchId || fromBarber || branches[0]?._id || "");
  }, [open, catalog, preset, branches]);

  const services = useMemo(
    () => catalog?.services.filter((s) => s.active && serviceInBranch(s, branchId)) ?? [],
    [catalog, branchId],
  );
  const barbers = useMemo(
    () =>
      catalog?.barbers.filter(
        (b) => b.active && b.branchId === branchId && (!form.serviceId || barberDoesService(b, form.serviceId)),
      ) ?? [],
    [catalog, branchId, form.serviceId],
  );
  const service = services.find((s) => s._id === form.serviceId);

  // Keep the barber valid for the chosen service.
  useEffect(() => {
    if (form.barberId !== "any" && catalog && !barbers.some((b) => b._id === form.barberId)) {
      setForm((f) => ({ ...f, barberId: "any" }));
    }
  }, [barbers, form.barberId, catalog]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onSlot = useCallback((t: string) => setForm((f) => ({ ...f, start: t })), []);

  async function lookupPhone() {
    const raw = form.phone.trim();
    if (!raw) return;
    const phone = normalizePhone(raw);
    if (!phone) {
      setPhoneError("Código de área + número, sin 0 y sin 15.");
      return;
    }
    setPhoneError(null);
    if (lastLookup.current === phone) return;
    lastLookup.current = phone;
    setLookup(true);
    try {
      const r = await api<{ client: KnownClient | null }>(`/api/admin/clients/by-phone?phone=${phone}`);
      setKnown(r.client);
      if (r.client?.name) setForm((f) => (f.name.trim() ? f : { ...f, name: r.client!.name }));
    } catch {
      setKnown(null);
    } finally {
      setLookup(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!normalizePhone(form.phone)) {
      setPhoneError("Código de área + número, sin 0 y sin 15.");
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ booking: AdminBooking }>("/api/admin/bookings", {
        method: "POST",
        body: { ...form, branchId, date },
      });
      onCreated(r.booking);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(form.phone && form.serviceId && branchId && date && form.start);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo turno"
      subtitle="Para clientes que llaman o vienen sin reserva."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-dim">
            {service ? (
              <>
                {service.name} · {formatDuration(service.durationMin)} ·{" "}
                <span className="text-ink">{formatPrice(service.price, catalog?.settings.currency)}</span>
              </>
            ) : (
              "Completá los datos"
            )}
          </p>
          <Button form="new-booking" type="submit" size="sm" loading={busy} disabled={!canSubmit}>
            Crear turno
          </Button>
        </div>
      }
    >
      {!catalog ? (
        <p className="flex items-center gap-2 text-sm text-dim">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando…
        </p>
      ) : (
        <form id="new-booking" onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono" error={phoneError} hint="Ej: 351 555 1234">
              {(id) => (
                <div className="relative">
                  <Input
                    id={id}
                    ref={phoneRef}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={form.phone}
                    aria-invalid={!!phoneError}
                    onChange={(e) => {
                      set("phone", e.target.value);
                      if (known) setKnown(null);
                      lastLookup.current = "";
                    }}
                    onBlur={lookupPhone}
                    className="h-11"
                  />
                  {lookup && (
                    <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-dim" aria-hidden="true" />
                  )}
                </div>
              )}
            </Field>
            <Field label="Nombre">
              {(id) => (
                <Input
                  id={id}
                  value={form.name}
                  autoComplete="off"
                  maxLength={80}
                  onChange={(e) => set("name", e.target.value)}
                  className="h-11"
                />
              )}
            </Field>
          </div>

          {known && (
            <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-dim animate-fade">
              <span className="inline-flex items-center gap-1 text-ink">
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Cliente existente
              </span>
              <span>{known.stats.completed} visitas</span>
              {known.stats.noShows > 0 && <span className="text-warn">{known.stats.noShows} no vino</span>}
              <span>
                Tarjeta {known.stamps}/{known.cardSize}
              </span>
              {known.member && (
                <span className="inline-flex items-center gap-1 text-ink">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Socio
                </span>
              )}
            </p>
          )}

          {branches.length > 1 && (
            <Field label="Sucursal">
              {(id) => (
                <Select id={id} value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-11">
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Servicio">
              {(id) => (
                <Select
                  id={id}
                  value={form.serviceId}
                  onChange={(e) => set("serviceId", e.target.value)}
                  className="h-11"
                  required
                >
                  <option value="">Elegí…</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} · {formatDuration(s.durationMin)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Barbero">
              {(id) => (
                <Select id={id} value={form.barberId} onChange={(e) => set("barberId", e.target.value)} className="h-11">
                  <option value="any">Cualquiera</option>
                  {barbers.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Fecha">
            {(id) => (
              <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" required />
            )}
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Horario</span>
            <SlotPicker
              branchId={branchId}
              serviceId={form.serviceId}
              barberId={form.barberId}
              date={date}
              value={form.start}
              onChange={onSlot}
            />
          </div>

          <Field label="Notas">
            {(id) => (
              <Textarea
                id={id}
                value={form.notes}
                maxLength={500}
                onChange={(e) => set("notes", e.target.value)}
                className="min-h-16 text-sm"
              />
            )}
          </Field>

          <ErrorText>{error}</ErrorText>
        </form>
      )}
    </Sheet>
  );
}
