"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Pencil, Plus, Scissors, Store, Trash2, UserRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, EmptyState, ErrorText, Field, Input, Pill, Select, Textarea, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  ActiveSwitch,
  Avatar,
  CatalogModal,
  CharCount,
  ChipMultiSelect,
  ConfirmDialog,
  FormActions,
  enter,
  errorMessage,
  fieldErrors,
  isHttpUrl,
  num,
} from "./parts";
import { ScheduleEditor, scheduleErrors } from "./ScheduleEditor";
import { DAY_LETTER, WEEK_ORDER, formatHours, summarizeSchedule, totalMinutes } from "./schedule-utils";
import { ToastProvider, useToast } from "./toast";
import type { BarberItem, BranchItem, ScheduleRange, ServiceItem } from "./types";
import { byOrderName, useCollection } from "./use-collection";

type Props = { initial: BarberItem[]; branches: BranchItem[]; services: ServiceItem[] };

export function BarbersManager(props: Props) {
  return (
    <ToastProvider>
      <Barbers {...props} />
    </ToastProvider>
  );
}

function Barbers({ initial, branches, services }: Props) {
  const toast = useToast();
  const col = useCollection<BarberItem>("/api/admin/barbers", initial, byOrderName);
  const [editing, setEditing] = useState<BarberItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<BarberItem | null>(null);

  const branchName = useMemo(() => new Map(branches.map((b) => [b._id, b.name])), [branches]);
  const serviceIds = useMemo(() => new Set(services.map((s) => s._id)), [services]);

  return (
    <>
      <AdminPageHeader
        title="Barberos"
        description="Quién atiende, dónde, qué servicios hace y en qué horarios."
        actions={
          branches.length > 0 && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo barbero
            </Button>
          )
        }
      />

      {branches.length === 0 ? (
        <EmptyState title="Primero creá una sucursal" icon={<Store className="h-6 w-6" />}>
          Cada barbero pertenece a una sucursal.{" "}
          <Link href="/admin/sucursales" className="text-ink underline underline-offset-4">
            Ir a Sucursales
          </Link>
        </EmptyState>
      ) : col.items.length === 0 ? (
        <EmptyState title="Todavía no hay barberos" icon={<UserRound className="h-6 w-6" />}>
          Agregá al primero para empezar a recibir turnos.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {col.items.map((b, i) => {
            const e = enter(i);
            const validServices = b.serviceIds.filter((id) => serviceIds.has(id));
            const summary = summarizeSchedule(b.schedule);
            const workDays = new Set(b.schedule.map((r) => r.day));
            return (
              <Card
                key={b._id}
                style={e.style}
                className={cn(e.className, "flex flex-col gap-4 p-4 transition-opacity duration-200", !b.active && "opacity-60")}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={b.name} url={b.photoUrl} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{b.name}</h3>
                      {!b.active && <Pill>Inactivo</Pill>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-dim">
                      <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {branchName.get(b.branchId) ?? "Sucursal eliminada"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-dim">
                      <Scissors className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {validServices.length === 0
                        ? "Todos los servicios"
                        : `${validServices.length} ${validServices.length === 1 ? "servicio" : "servicios"}`}
                    </p>
                  </div>
                  <ActiveSwitch
                    checked={b.active}
                    label={`${b.name} activo`}
                    onToggle={async (active) => {
                      await col.patchOptimistic(b._id, { active });
                      toast(active ? `${b.name} vuelve a recibir turnos.` : `${b.name} ya no aparece para reservar.`);
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1" aria-label="Días de atención">
                      {WEEK_ORDER.map((d) => (
                        <span
                          key={d}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold",
                            workDays.has(d) ? "bg-ink text-bg" : "border border-line text-faint",
                          )}
                        >
                          {DAY_LETTER[d]}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs tabular-nums text-dim">{formatHours(totalMinutes(b.schedule))}/sem</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5 text-xs text-dim">
                    {summary.length ? summary.map((line) => <span key={line}>{line}</span>) : <span className="text-warn">Sin horarios cargados</span>}
                  </div>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button variant="subtle" size="sm" className="flex-1" onClick={() => setEditing(b)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(b)} aria-label={`Eliminar a ${b.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CatalogModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo barbero" : "Editar barbero"}
        wide
      >
        {editing !== null && (
          <BarberForm
            barber={editing === "new" ? null : editing}
            branches={branches}
            services={services}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (editing === "new") await col.create(body);
              else await col.update(editing._id, body);
              setEditing(null);
              toast(editing === "new" ? "Barbero creado." : "Cambios guardados.");
            }}
          />
        )}
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar barbero"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await col.remove(deleting._id);
          toast(
            result === "deleted"
              ? `${deleting.name} fue eliminado.`
              : `${deleting.name} tiene turnos registrados: lo desactivamos para conservar el historial.`,
            result === "deleted" ? "ok" : "warn",
          );
        }}
      >
        <p>
          ¿Eliminar a <strong className="text-ink">{deleting?.name}</strong>?
        </p>
        <p>Si tiene turnos registrados no se borra: queda desactivado para conservar el historial.</p>
      </ConfirmDialog>
    </>
  );
}

type BarberBody = Omit<BarberItem, "_id" | "order"> & { order?: number };

function BarberForm({
  barber,
  branches,
  services,
  onSave,
  onCancel,
}: {
  barber: BarberItem | null;
  branches: BranchItem[];
  services: ServiceItem[];
  onSave: (body: BarberBody) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(barber?.name ?? "");
  const [photoUrl, setPhotoUrl] = useState(barber?.photoUrl ?? "");
  const [bio, setBio] = useState(barber?.bio ?? "");
  const [branchId, setBranchId] = useState(barber?.branchId ?? branches.find((b) => b.active)?._id ?? branches[0]?._id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(barber?.serviceIds ?? []);
  const [schedule, setSchedule] = useState<ScheduleRange[]>(barber?.schedule ?? []);
  const [active, setActive] = useState(barber?.active ?? true);
  const [order, setOrder] = useState(String(barber?.order ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Services offered at the chosen branch (a service with no branches is offered everywhere).
  const available = services.filter((s) => s.branchIds.length === 0 || s.branchIds.includes(branchId));
  const availableIds = new Set(available.map((s) => s._id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresá el nombre.";
    if (photoUrl.trim() && !isHttpUrl(photoUrl.trim())) errs.photoUrl = "Tiene que ser un link que empiece con https://";
    if (bio.length > 300) errs.bio = "Máximo 300 caracteres.";
    if (!branchId) errs.branchId = "Elegí una sucursal.";
    const orderN = order.trim() === "" ? undefined : num(order);
    if (orderN === null || (orderN !== undefined && !Number.isInteger(orderN))) errs.order = "Número entero.";
    const schedErr = scheduleErrors(schedule);
    if (Object.keys(schedErr).length) errs.schedule = "Revisá los horarios marcados en rojo.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setFormError("");
    try {
      await onSave({
        name: name.trim(),
        photoUrl: photoUrl.trim(),
        bio: bio.trim(),
        branchId,
        serviceIds: serviceIds.filter((id) => availableIds.has(id)),
        schedule,
        active,
        ...(orderN != null ? { order: orderN } : {}),
      });
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar name={name || "?"} url={isHttpUrl(photoUrl.trim()) ? photoUrl.trim() : ""} size={72} className="mt-6" />
        <div className="flex flex-1 flex-col gap-4">
          <Field label="Nombre" error={errors.name}>
            {(id) => (
              <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-invalid={!!errors.name} />
            )}
          </Field>
          <Field label="Foto (URL)" hint="Se muestra en blanco y negro. Pegá un link público a la imagen." error={errors.photoUrl}>
            {(id) => (
              <Input
                id={id}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                aria-invalid={!!errors.photoUrl}
              />
            )}
          </Field>
        </div>
      </div>

      <Field label="Bio" hint={<CharCount value={bio} max={300} />} error={errors.bio}>
        {(id) => (
          <Textarea
            id={id}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            placeholder="Especialista en fades y barba…"
            aria-invalid={!!errors.bio}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Sucursal" error={errors.branchId}>
          {(id) => (
            <Select id={id} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-invalid={!!errors.branchId}>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                  {b.active ? "" : " (inactiva)"}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Orden" hint="Menor = primero" error={errors.order}>
          {(id) => (
            <Input id={id} inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="Auto" />
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-dim">Servicios que hace</legend>
        <ChipMultiSelect
          options={available.map((s) => ({ id: s._id, label: s.name, muted: !s.active }))}
          value={serviceIds.filter((id) => availableIds.has(id))}
          onChange={setServiceIds}
          allLabel="Todos"
          emptyText="No hay servicios disponibles en esta sucursal."
        />
        <p className="text-xs text-faint">Sin selección = hace todos los servicios de la sucursal.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-dim">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Horario semanal
        </legend>
        <ScheduleEditor initial={barber?.schedule ?? []} onChange={setSchedule} showErrors={submitted} />
        {errors.schedule && (
          <p className="text-xs text-bad" role="alert">
            {errors.schedule}
          </p>
        )}
      </fieldset>

      <Toggle checked={active} onChange={setActive} label="Activo (aparece para reservar)" />

      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel={barber ? "Guardar cambios" : "Crear barbero"} />
    </form>
  );
}
