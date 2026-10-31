"use client";

import { useState } from "react";
import { ExternalLink, MapPin, Pencil, Phone, Plus, Store, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, EmptyState, ErrorText, Field, Input, Pill, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ActiveSwitch, CatalogModal, ConfirmDialog, FormActions, enter, errorMessage, fieldErrors, isHttpUrl, num } from "./parts";
import { ToastProvider, useToast } from "./toast";
import type { BranchItem } from "./types";
import { byOrderName, useCollection } from "./use-collection";

type Props = { initial: BranchItem[]; barberCount: Record<string, number> };

export function BranchesManager(props: Props) {
  return (
    <ToastProvider>
      <Branches {...props} />
    </ToastProvider>
  );
}

function Branches({ initial, barberCount }: Props) {
  const toast = useToast();
  const col = useCollection<BranchItem>("/api/admin/branches", initial, byOrderName);
  const [editing, setEditing] = useState<BranchItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<BranchItem | null>(null);

  return (
    <>
      <AdminPageHeader
        title="Sucursales"
        description="Los locales donde se atiende. Cada barbero pertenece a una."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nueva sucursal
          </Button>
        }
      />

      {col.items.length === 0 ? (
        <EmptyState title="Todavía no hay sucursales" icon={<Store className="h-6 w-6" />}>
          Creá la primera para poder cargar barberos.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {col.items.map((b, i) => {
            const e = enter(i);
            const barbers = barberCount[b._id] ?? 0;
            return (
              <Card key={b._id} style={e.style} className={cn(e.className, "flex flex-col gap-3 p-4 transition-opacity duration-200", !b.active && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{b.name}</h3>
                      {!b.active && <Pill>Inactiva</Pill>}
                    </div>
                    <p className="mt-0.5 text-xs text-faint">
                      {barbers} {barbers === 1 ? "barbero" : "barberos"}
                    </p>
                  </div>
                  <ActiveSwitch
                    checked={b.active}
                    label={`${b.name} activa`}
                    onToggle={async (active) => {
                      await col.patchOptimistic(b._id, { active });
                      toast(active ? `${b.name} está activa.` : `${b.name} ya no aparece para reservar.`);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-dim">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {b.address || <span className="text-faint">Sin dirección</span>}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {b.phone || <span className="text-faint">Sin teléfono</span>}
                  </p>
                  {b.mapsUrl && (
                    <a
                      href={b.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 text-ink underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className="mt-auto flex gap-2 pt-1">
                  <Button variant="subtle" size="sm" className="flex-1" onClick={() => setEditing(b)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(b)} aria-label={`Eliminar ${b.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CatalogModal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nueva sucursal" : "Editar sucursal"}>
        {editing !== null && (
          <BranchForm
            branch={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (editing === "new") await col.create(body);
              else await col.update(editing._id, body);
              setEditing(null);
              toast(editing === "new" ? "Sucursal creada." : "Cambios guardados.");
            }}
          />
        )}
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar sucursal"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await col.remove(deleting._id);
          toast(
            result === "deleted"
              ? `${deleting.name} fue eliminada.`
              : `${deleting.name} tiene turnos o barberos asociados: la desactivamos en lugar de borrarla.`,
            result === "deleted" ? "ok" : "warn",
          );
        }}
      >
        <p>
          ¿Eliminar <strong className="text-ink">{deleting?.name}</strong>?
        </p>
        <p>Si tiene turnos registrados o barberos asignados no se borra: queda desactivada.</p>
      </ConfirmDialog>
    </>
  );
}

function BranchForm({
  branch,
  onSave,
  onCancel,
}: {
  branch: BranchItem | null;
  onSave: (body: Partial<BranchItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [mapsUrl, setMapsUrl] = useState(branch?.mapsUrl ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [active, setActive] = useState(branch?.active ?? true);
  const [order, setOrder] = useState(branch ? String(branch.order) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const mapsOk = isHttpUrl(mapsUrl.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresá el nombre.";
    if (mapsUrl.trim() && !mapsOk) errs.mapsUrl = "Pegá el link completo (https://maps.app.goo.gl/…).";
    const orderN = order.trim() === "" ? undefined : num(order);
    if (orderN === null || (orderN !== undefined && !Number.isInteger(orderN))) errs.order = "Número entero.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError("");
    try {
      await onSave({
        name: name.trim(),
        address: address.trim(),
        mapsUrl: mapsUrl.trim(),
        phone: phone.trim(),
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
      <Field label="Nombre" error={errors.name}>
        {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-invalid={!!errors.name} />}
      </Field>
      <Field label="Dirección" error={errors.address}>
        {(id) => <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Av. Siempreviva 742, Córdoba" />}
      </Field>
      <Field
        label="Link de Google Maps"
        error={errors.mapsUrl}
        hint={
          mapsOk ? (
            <a href={mapsUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-4">
              Probar link <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            "En Google Maps: Compartir → Copiar vínculo."
          )
        }
      >
        {(id) => (
          <Input
            id={id}
            type="url"
            inputMode="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            aria-invalid={!!errors.mapsUrl}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Teléfono" error={errors.phone}>
          {(id) => <Input id={id} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="351 370 4782" />}
        </Field>
        <Field label="Orden" hint="Menor = primero" error={errors.order}>
          {(id) => <Input id={id} inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="Auto" />}
        </Field>
      </div>
      <Toggle checked={active} onChange={setActive} label="Activa (aparece para reservar)" />
      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel={branch ? "Guardar cambios" : "Crear sucursal"} />
    </form>
  );
}
