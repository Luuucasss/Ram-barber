"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Crown, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { AdminFab, AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, EmptyState, ErrorText, Field, Input, Pill, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatDuration, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ActiveSwitch,
  CatalogModal,
  CharCount,
  ChipMultiSelect,
  ConfirmDialog,
  FormActions,
  FormToggle,
  enter,
  errorMessage,
  fieldErrors,
  num,
  revealFirstError,
  useFlip,
} from "./parts";
import { ToastProvider, useToast } from "./toast";
import type { BranchItem, ServiceItem } from "./types";
import { byOrderName, useCollection } from "./use-collection";

type Props = { initial: ServiceItem[]; branches: BranchItem[]; currency: string };

export function ServicesManager(props: Props) {
  return (
    <ToastProvider>
      <Services {...props} />
    </ToastProvider>
  );
}

function Services({ initial, branches, currency }: Props) {
  const toast = useToast();
  const col = useCollection<ServiceItem>("/api/admin/services", initial, byOrderName);
  const [editing, setEditing] = useState<ServiceItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServiceItem | null>(null);
  const reorderSeq = useRef(0);
  const flipRef = useFlip(col.items.map((s) => s._id));
  const branchName = useMemo(() => new Map(branches.map((b) => [b._id, b.name])), [branches]);

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= col.items.length) return;
    const previous = col.items;
    const next = [...previous];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((s, i) => ({ ...s, order: i + 1 }));
    col.setItems(renumbered);
    const seq = ++reorderSeq.current;
    try {
      const res = await api<{ items: ServiceItem[] }>("/api/admin/services/reorder", {
        method: "POST",
        body: { ids: renumbered.map((s) => s._id) },
      });
      if (seq === reorderSeq.current) col.setItems(res.items);
    } catch (e) {
      if (seq === reorderSeq.current) col.setItems(previous);
      toast(errorMessage(e, "No se pudo guardar el nuevo orden."), "bad");
    }
  }

  const branchLabel = (s: ServiceItem) => {
    const names = s.branchIds.map((id) => branchName.get(id)).filter(Boolean);
    if (!names.length) return branches.length > 1 ? "Todas las sucursales" : null;
    return names.join(", ");
  };

  return (
    <>
      <AdminPageHeader
        title="Servicios"
        description="Lo que se puede reservar. El orden de esta lista es el que ven los clientes."
        actions={
          <Button onClick={() => setEditing("new")} className="hidden md:inline-flex">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo servicio
          </Button>
        }
      />
      <AdminFab onClick={() => setEditing("new")} icon={<Plus className="h-5 w-5" aria-hidden="true" />}>
        Nuevo servicio
      </AdminFab>

      {col.items.length === 0 ? (
        <EmptyState title="Todavía no hay servicios" icon={<Scissors className="h-6 w-6" />}>
          Creá el primero (por ejemplo, “Corte”).
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul className="relative divide-y divide-line">
            {col.items.map((s, i) => {
              const e = enter(i);
              const where = branchLabel(s);
              return (
                <li
                  key={s._id}
                  ref={flipRef(s._id)}
                  style={e.style}
                  // Phones: two rows — [info | switch] over [↑ ↓ | edit delete], all 44px targets.
                  // sm+: a single row with the stacked chevrons on the left (grid placement is ignored by flex).
                  className={cn(
                    e.className,
                    "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-card px-3 pb-1.5 pt-3 sm:flex sm:gap-3 sm:px-4 sm:py-3",
                  )}
                >
                  <div className="col-start-1 row-start-2 -ml-2 flex sm:ml-0 sm:flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-dim transition-[color,background-color,transform] duration-150 hover:bg-white/5 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-25 sm:pointer-fine:h-auto sm:pointer-fine:w-auto sm:pointer-fine:p-1.5"
                      aria-label={`Subir ${s.name}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === col.items.length - 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-dim transition-[color,background-color,transform] duration-150 hover:bg-white/5 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-25 sm:pointer-fine:h-auto sm:pointer-fine:w-auto sm:pointer-fine:p-1.5"
                      aria-label={`Bajar ${s.name}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className={cn("col-start-1 row-start-1 min-w-0 flex-1 text-left transition-opacity duration-200", !s.active && "opacity-55")}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-semibold">{s.name}</span>
                      {s.includedInPlan && (
                        <Pill className="gap-1 px-2 py-0 text-[11px]">
                          <Crown className="h-3 w-3" aria-hidden="true" /> Plan
                        </Pill>
                      )}
                      {!s.active && <Pill className="px-2 py-0 text-[11px]">Inactivo</Pill>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-dim">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDuration(s.durationMin)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-ink">{formatPrice(s.price, currency)}</span>
                      {where && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="min-w-0 truncate">{where}</span>
                        </>
                      )}
                    </span>
                    {s.description && <span className="mt-0.5 hidden truncate text-xs text-faint sm:block">{s.description}</span>}
                  </button>

                  <div className="col-start-2 row-start-1 flex justify-end">
                    <ActiveSwitch
                      checked={s.active}
                      label={`${s.name} activo`}
                      onToggle={async (active) => {
                        await col.patchOptimistic(s._id, { active });
                        toast(active ? `“${s.name}” se puede reservar.` : `“${s.name}” ya no se ofrece.`);
                      }}
                    />
                  </div>
                  <div className="col-start-2 row-start-2 -mr-2 flex justify-end sm:mr-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`} className="h-11 w-11 sm:pointer-fine:h-10 sm:pointer-fine:w-10">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} aria-label={`Eliminar ${s.name}`} className="h-11 w-11 sm:pointer-fine:h-10 sm:pointer-fine:w-10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {/* Keeps the last row clear of the floating "Nuevo servicio" button on phones. */}
      <div aria-hidden="true" className="h-16 md:hidden" />

      <CatalogModal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo servicio" : "Editar servicio"}>
        {editing !== null && (
          <ServiceForm
            service={editing === "new" ? null : editing}
            branches={branches}
            currency={currency}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (editing === "new") await col.create(body);
              else await col.update(editing._id, body);
              setEditing(null);
              toast(editing === "new" ? "Servicio creado." : "Cambios guardados.");
            }}
          />
        )}
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar servicio"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await col.remove(deleting._id);
          toast(
            result === "deleted"
              ? `“${deleting.name}” fue eliminado.`
              : `“${deleting.name}” tiene turnos registrados: lo desactivamos para conservar el historial.`,
            result === "deleted" ? "ok" : "warn",
          );
        }}
      >
        <p>
          ¿Eliminar <strong className="text-ink">“{deleting?.name}”</strong>?
        </p>
        <p>Si ya tiene turnos registrados no se borra: queda desactivado.</p>
      </ConfirmDialog>
    </>
  );
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];

function ServiceForm({
  service,
  branches,
  currency,
  onSave,
  onCancel,
}: {
  service: ServiceItem | null;
  branches: BranchItem[];
  currency: string;
  onSave: (body: Omit<ServiceItem, "_id" | "order">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMin ?? 30));
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [includedInPlan, setIncludedInPlan] = useState(service?.includedInPlan ?? true);
  const [branchIds, setBranchIds] = useState<string[]>(service?.branchIds ?? []);
  const [active, setActive] = useState(service?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const durationN = num(duration);
  const priceN = num(price);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresá el nombre.";
    if (description.length > 400) errs.description = "Máximo 400 caracteres.";
    if (durationN === null || !Number.isInteger(durationN) || durationN < 5 || durationN > 480 || durationN % 5)
      errs.durationMin = "Entre 5 y 480 minutos, de a 5.";
    if (priceN === null || priceN < 0) errs.price = "Ingresá un precio válido.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      revealFirstError(form);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        durationMin: durationN as number,
        price: Math.round(priceN as number),
        includedInPlan,
        branchIds: branchIds.filter((id) => branches.some((b) => b._id === id)),
        active,
      });
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      revealFirstError(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field label="Nombre" error={errors.name}>
        {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-invalid={!!errors.name} />}
      </Field>
      <Field label="Descripción" hint={<CharCount value={description} max={400} />} error={errors.description}>
        {(id) => (
          <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué incluye el servicio" />
        )}
      </Field>

      <Field label="Duración" error={errors.durationMin} hint={durationN && durationN >= 5 ? formatDuration(durationN) : undefined}>
        {(id) => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Duraciones frecuentes">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={durationN === m}
                  onClick={() => setDuration(String(m))}
                  className={cn(
                    "h-11 rounded-full border px-4 text-sm tabular-nums sm:pointer-fine:h-9 sm:pointer-fine:px-3.5 transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]",
                    durationN === m ? "border-ink bg-ink font-medium text-bg" : "border-line-strong text-dim hover:border-ink hover:text-ink",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="relative w-40">
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="pr-14 tabular-nums"
                aria-invalid={!!errors.durationMin}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">min</span>
            </div>
          </div>
        )}
      </Field>

      <Field
        label={`Precio (${currency})`}
        error={errors.price}
        hint={priceN !== null && priceN >= 0 && price !== "" ? formatPrice(priceN, currency) : undefined}
      >
        {(id) => (
          <div className="relative w-48">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim">$</span>
            <Input
              id={id}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="14000"
              className="pl-8 tabular-nums"
              aria-invalid={!!errors.price}
            />
          </div>
        )}
      </Field>

      <div className="rounded-2xl border border-line bg-surface px-4 py-2.5 sm:py-4">
        <FormToggle checked={includedInPlan} onChange={setIncludedInPlan} label="Incluido en planes de exclusividad" />
        <p className="mt-1 pb-1.5 text-xs text-faint sm:mt-2 sm:pb-0">Los clientes con un plan activo lo reservan sin cargo (descuenta un corte del plan).</p>
      </div>

      {branches.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-dim">Sucursales</legend>
          <ChipMultiSelect
            options={branches.map((b) => ({ id: b._id, label: b.name, muted: !b.active }))}
            value={branchIds}
            onChange={setBranchIds}
            allLabel="Todas"
          />
        </fieldset>
      )}

      <FormToggle checked={active} onChange={setActive} label="Activo (se puede reservar)" />

      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel={service ? "Guardar cambios" : "Crear servicio"} />
    </form>
  );
}
