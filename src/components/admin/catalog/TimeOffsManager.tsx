"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CalendarOff, ChevronDown, Info, Plus, Store, Trash2, UserRound, Users } from "lucide-react";
import { AdminFab, AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, EmptyState, ErrorText, Field, Input, Pill, Select } from "@/components/ui";
import { dateChip, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CatalogModal, ConfirmDialog, FormActions, FormToggle, enter, errorMessage, fieldErrors, revealFirstError } from "./parts";
import { toMin } from "./schedule-utils";
import { ToastProvider, useToast } from "./toast";
import type { BarberItem, BranchItem, TimeOffItem } from "./types";
import { useCollection } from "./use-collection";

type Props = { initial: TimeOffItem[]; today: string; branches: BranchItem[]; barbers: BarberItem[] };

const byDate = (a: TimeOffItem, b: TimeOffItem) =>
  a.dateFrom.localeCompare(b.dateFrom) || (a.start || "").localeCompare(b.start || "") || a.dateTo.localeCompare(b.dateTo);

export function TimeOffsManager(props: Props) {
  return (
    <ToastProvider>
      <TimeOffs {...props} />
    </ToastProvider>
  );
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

function shortDate(iso: string) {
  const c = dateChip(iso);
  return `${c.day} ${c.num} ${c.month}`;
}

function TimeOffs({ initial, today, branches, barbers }: Props) {
  const toast = useToast();
  const col = useCollection<TimeOffItem>("/api/admin/timeoffs", initial, byDate);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TimeOffItem | null>(null);
  const [showPast, setShowPast] = useState(false);

  const branchName = useMemo(() => new Map(branches.map((b) => [b._id, b.name])), [branches]);
  const barberName = useMemo(() => new Map(barbers.map((b) => [b._id, b.name])), [barbers]);

  const upcoming = col.items.filter((t) => t.dateTo >= today);
  const past = col.items.filter((t) => t.dateTo < today).reverse();

  const scopeOf = (t: TimeOffItem) =>
    t.barberId
      ? { icon: UserRound, label: barberName.get(t.barberId) ?? "Barbero eliminado" }
      : t.branchId
        ? { icon: Store, label: branchName.get(t.branchId) ?? "Sucursal eliminada" }
        : { icon: Users, label: "Todo el local" };

  // Plain render function (not a nested component) so rows keep their identity across renders.
  const renderRow = (t: TimeOffItem, i: number, isPast = false) => {
    const scope = scopeOf(t);
    const chip = dateChip(t.dateFrom);
    const days = daysBetween(t.dateFrom, t.dateTo);
    const ongoing = t.dateFrom <= today && t.dateTo >= today;
    const e = enter(i);
    return (
      <li key={t._id} style={e.style} className={cn(e.className, "flex items-start gap-3 px-3 py-3.5 sm:gap-4 sm:px-4", isPast && "opacity-60")}>
        <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-line-strong bg-surface py-1.5 leading-none">
          <span className="text-[10px] uppercase tracking-wider text-faint">{chip.day}</span>
          <span className="mt-1 text-lg font-semibold tabular-nums">{chip.num}</span>
          <span className="mt-0.5 text-[10px] uppercase text-dim">{chip.month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {days === 1 ? formatDateLong(t.dateFrom) : `${shortDate(t.dateFrom)} → ${shortDate(t.dateTo)}`}
            </span>
            {ongoing && <Pill tone="ink" className="px-2 py-0 text-[11px]">En curso</Pill>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-dim">
            <span>{t.allDay ? (days > 1 ? `${days} días completos` : "Todo el día") : `${t.start} a ${t.end}${days > 1 ? ` · ${days} días` : ""}`}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <scope.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {scope.label}
            </span>
          </p>
          {t.reason && <p className="mt-1 break-words text-sm text-ink/90">{t.reason}</p>}
          {!isPast && (t.overlappingBookings ?? 0) > 0 && (
            <div className="mt-2 flex gap-2 rounded-xl border border-line-strong bg-card-2 pl-3 pr-1 pt-2 text-xs text-dim">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-ink" aria-hidden="true" />
              <div className="flex min-w-0 flex-col items-start">
                <p>
                  {t.overlappingBookings === 1 ? "Hay 1 turno confirmado" : `Hay ${t.overlappingBookings} turnos confirmados`} en este período.
                </p>
                {/* 44px tall tap target on touch; the box has no bottom padding so the link's own height closes it. */}
                <Link
                  href="/admin/turnos"
                  className="-ml-1 inline-flex min-h-11 items-center px-1 font-medium text-ink underline underline-offset-4 sm:pointer-fine:min-h-8"
                >
                  Revisalos en Turnos
                </Link>
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="-mr-1.5 -mt-1.5 h-11 w-11 shrink-0 sm:pointer-fine:m-0 sm:pointer-fine:h-10 sm:pointer-fine:w-10" onClick={() => setDeleting(t)} aria-label="Eliminar bloqueo">
          <Trash2 className="h-4 w-4" />
        </Button>
      </li>
    );
  };

  return (
    <>
      <AdminPageHeader
        title="Bloqueos"
        description="Vacaciones, feriados y horarios en los que no se toman turnos."
        actions={
          <Button onClick={() => setCreating(true)} className="hidden md:inline-flex">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo bloqueo
          </Button>
        }
      />
      <AdminFab onClick={() => setCreating(true)} icon={<Plus className="h-5 w-5" aria-hidden="true" />}>
        Nuevo bloqueo
      </AdminFab>

      <div className="mb-6 flex gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-dim">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
        <p>
          Un bloqueo impide <strong className="font-medium text-ink">nuevas</strong> reservas en ese período. Los turnos que ya estaban
          confirmados <strong className="font-medium text-ink">no se cancelan automáticamente</strong>: avisale a esos clientes y
          cancelalos desde Turnos.
        </p>
      </div>

      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-dim">Próximos</h2>
      {upcoming.length === 0 ? (
        <EmptyState title="No hay bloqueos próximos" icon={<CalendarOff className="h-6 w-6" />}>
          Todo el calendario está abierto para reservar.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {upcoming.map((t, i) => renderRow(t, i))}
          </ul>
        </Card>
      )}

      {past.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="flex min-h-11 items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-dim transition-colors hover:text-ink sm:min-h-0"
          >
            Pasados ({past.length})
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", showPast && "rotate-180")}
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              aria-hidden="true"
            />
          </button>
          {/* Accordion: grid-rows 0fr → 1fr is the one sanctioned height animation. */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]",
              showPast ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
            inert={!showPast}
          >
            <div className="overflow-hidden">
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {past.map((t, i) => renderRow(t, i, true))}
                </ul>
              </Card>
            </div>
          </div>
        </section>
      )}
      {/* Keeps the last row clear of the floating "Nuevo bloqueo" button on phones. */}
      <div aria-hidden="true" className="h-16 md:hidden" />

      <CatalogModal open={creating} onClose={() => setCreating(false)} title="Nuevo bloqueo">
        <TimeOffForm
          today={today}
          branches={branches}
          barbers={barbers}
          onCancel={() => setCreating(false)}
          onCreate={async (body) => {
            const res = await col.create<{ item: TimeOffItem; overlappingBookings: number }>(body);
            col.upsert({ ...res.item, overlappingBookings: res.overlappingBookings });
            return res.overlappingBookings;
          }}
          onDone={(overlapping) => {
            setCreating(false);
            toast(
              overlapping > 0
                ? `Bloqueo creado. Quedan ${overlapping} ${overlapping === 1 ? "turno confirmado" : "turnos confirmados"} en ese período.`
                : "Bloqueo creado.",
              overlapping > 0 ? "warn" : "ok",
            );
          }}
        />
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar bloqueo"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await col.remove(deleting._id);
          toast("Bloqueo eliminado. Esos horarios vuelven a estar disponibles.");
        }}
      >
        <p>
          ¿Eliminar el bloqueo
          {deleting && (
            <strong className="text-ink">
              {" "}
              {deleting.dateFrom === deleting.dateTo ? formatDateLong(deleting.dateFrom) : `${shortDate(deleting.dateFrom)} → ${shortDate(deleting.dateTo)}`}
            </strong>
          )}
          ?
        </p>
        <p>Esos horarios vuelven a quedar disponibles para reservar.</p>
      </ConfirmDialog>
    </>
  );
}

type Scope = "all" | "branch" | "barber";

/** Date inputs: tighter padding on phones so "30/10/2026" + the picker icon fit two per row. */
const DATE_INPUT = "px-3 tabular-nums sm:px-4";
/** Time inputs: fill their cell on phones, fixed width (fits "01:00 p. m." + icon) from sm; 16px text on touch (no iOS zoom). */
const TIME_INPUT =
  "h-11 w-full min-w-0 rounded-xl border border-line bg-bg px-2.5 text-base tabular-nums focus:border-ink focus:outline-none aria-[invalid=true]:border-ink aria-[invalid=true]:shadow-[0_0_0_1px_var(--color-ink)] max-sm:[&::-webkit-calendar-picker-indicator]:hidden pointer-coarse:[&::-webkit-calendar-picker-indicator]:hidden sm:w-36 sm:px-3 sm:pointer-fine:text-sm";
const REASONS = ["Vacaciones", "Feriado", "Capacitación", "Trámite personal", "Mantenimiento del local"];

function TimeOffForm({
  today,
  branches,
  barbers,
  onCreate,
  onDone,
  onCancel,
}: {
  today: string;
  branches: BranchItem[];
  barbers: BarberItem[];
  onCreate: (body: Omit<TimeOffItem, "_id">) => Promise<number>;
  onDone: (overlapping: number) => void;
  onCancel: () => void;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const [branchId, setBranchId] = useState(branches[0]?._id ?? "");
  const [barberId, setBarberId] = useState(barbers.find((b) => b.active)?._id ?? barbers[0]?._id ?? "");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("17:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const scopes: { id: Scope; label: string; icon: typeof Users }[] = [
    { id: "all", label: "Todo el local", icon: Users },
    ...(branches.length > 1 ? [{ id: "branch" as const, label: "Sucursal", icon: Store }] : []),
    { id: "barber", label: "Barbero", icon: UserRound },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const errs: Record<string, string> = {};
    if (!dateFrom) errs.dateFrom = "Elegí la fecha.";
    if (!dateTo) errs.dateTo = "Elegí la fecha.";
    if (dateFrom && dateTo && dateTo < dateFrom) errs.dateTo = "Tiene que ser igual o posterior a “desde”.";
    if (!allDay) {
      if (!start || !end || toMin(start) >= toMin(end)) errs.end = "La hora de fin tiene que ser posterior al inicio.";
      else if (toMin(start) % 5 || toMin(end) % 5) errs.end = "Usá horarios en pasos de 5 minutos.";
    }
    if (scope === "branch" && !branchId) errs.branchId = "Elegí una sucursal.";
    if (scope === "barber" && !barberId) errs.barberId = "Elegí un barbero.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      revealFirstError(form);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const overlapping = await onCreate({
        branchId: scope === "branch" ? branchId : null,
        barberId: scope === "barber" ? barberId : null,
        dateFrom,
        dateTo,
        allDay,
        start: allDay ? "" : start,
        end: allDay ? "" : end,
        reason: reason.trim(),
      });
      if (overlapping > 0) setResult(overlapping);
      else onDone(0);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      revealFirstError(form);
    } finally {
      setSaving(false);
    }
  }

  if (result !== null) {
    return (
      <div className="flex animate-[fade_200ms_ease-out_both] flex-col gap-4">
        <div className="flex gap-3 rounded-2xl border border-line-strong bg-card-2 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-medium text-ink">Bloqueo creado.</p>
            <p className="text-dim">
              {result === 1 ? "Hay 1 turno confirmado" : `Hay ${result} turnos confirmados`} dentro de ese período. No se cancelaron: avisale a
              {result === 1 ? " ese cliente" : " esos clientes"} y cancelalos desde Turnos si hace falta.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 max-sm:pb-[env(safe-area-inset-bottom)]">
          <Link
            href="/admin/turnos"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-ink max-sm:flex-1"
          >
            Ir a Turnos
          </Link>
          <Button onClick={() => onDone(result)} className="max-sm:flex-1">
            Entendido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-dim">¿A quién afecta?</legend>
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-2xl border border-line bg-surface p-1" role="radiogroup">
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={scope === s.id}
              aria-label={s.label}
              onClick={() => setScope(s.id)}
              className={cn(
                "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm transition-[background-color,color] duration-150 sm:pointer-fine:h-10",
                scope === s.id ? "bg-ink font-medium text-bg" : "text-dim hover:text-ink",
              )}
            >
              <s.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
        {scope === "branch" && (
          <Field label="Sucursal" error={errors.branchId} className="mt-1 animate-[fade_160ms_ease-out_both]">
            {(id) => (
              <Select id={id} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-invalid={!!errors.branchId}>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {scope === "barber" &&
          (barbers.length ? (
            <Field label="Barbero" error={errors.barberId} className="mt-1 animate-[fade_160ms_ease-out_both]">
              {(id) => (
                <Select id={id} value={barberId} onChange={(e) => setBarberId(e.target.value)} aria-invalid={!!errors.barberId}>
                  {barbers.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                      {b.active ? "" : " (inactivo)"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <p className="text-sm text-faint" role="alert">
              No hay barberos cargados.
            </p>
          ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <Field label="Desde" error={errors.dateFrom}>
          {(id) => (
            <Input
              id={id}
              type="date"
              className={DATE_INPUT}
              value={dateFrom}
              min={today}
              onChange={(e) => {
                const v = e.target.value;
                setDateFrom(v);
                if (v && (!dateTo || dateTo < v)) setDateTo(v);
              }}
              aria-invalid={!!errors.dateFrom}
            />
          )}
        </Field>
        <Field label="Hasta" error={errors.dateTo}>
          {(id) => (
            <Input
              id={id}
              type="date"
              className={DATE_INPUT}
              value={dateTo}
              min={dateFrom || today}
              onChange={(e) => setDateTo(e.target.value)}
              aria-invalid={!!errors.dateTo}
            />
          )}
        </Field>
      </div>
      {dateFrom && dateTo && dateTo >= dateFrom && (
        <p className="-mt-3 text-xs text-faint">
          {dateFrom === dateTo ? formatDateLong(dateFrom) : `${daysBetween(dateFrom, dateTo)} días, del ${formatDateLong(dateFrom).toLowerCase()} al ${formatDateLong(dateTo).toLowerCase()}`}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-2 sm:gap-3 sm:py-4">
        <FormToggle checked={allDay} onChange={setAllDay} label="Todo el día" />
        {!allDay && (
          <div className="flex animate-[fade_160ms_ease-out_both] flex-col gap-1.5 pb-2 sm:pb-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
              <input
                type="time"
                step={300}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-label="Hora de inicio"
                className={TIME_INPUT}
              />
              <span className="text-xs text-faint">a</span>
              <input
                type="time"
                step={300}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                aria-label="Hora de fin"
                aria-invalid={!!errors.end}
                className={TIME_INPUT}
              />
            </div>
            {errors.end ? (
              <p className="flex items-start gap-1.5 text-xs font-medium text-ink" role="alert">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.end}
              </p>
            ) : <p className="text-xs text-faint">Se aplica en ese horario cada día del período.</p>}
          </div>
        )}
      </div>

      <Field label="Motivo (opcional)" error={errors.reason}>
        {(id) => (
          <div className="flex flex-col gap-2">
            <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ej.: Vacaciones" />
            {/* Phones: one swipeable row of 44px chips (bleeds to the sheet edges); sm+: wrapped small chips. */}
            <div className="-mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    "h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] sm:pointer-fine:h-auto sm:pointer-fine:px-3 sm:pointer-fine:py-1 sm:pointer-fine:text-xs",
                    reason === r ? "border-ink bg-ink text-bg" : "border-line text-dim hover:border-line-strong hover:text-ink",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>

      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel="Crear bloqueo" />
    </form>
  );
}
