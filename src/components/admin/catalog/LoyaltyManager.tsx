"use client";

import { useCallback, useRef, useState } from "react";
import { Crown, Gift, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, EmptyState, ErrorText, Field, Input, Pill, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/validation";
import {
  ActiveSwitch,
  CatalogModal,
  CharCount,
  ConfirmDialog,
  FormActions,
  ImagePreview,
  SectionHeading,
  enter,
  errorMessage,
  fieldErrors,
  isHttpUrl,
  num,
} from "./parts";
import { StampCardPreview } from "./StampCardPreview";
import { ToastProvider, useToast } from "./toast";
import type { PlanItem, RewardItem } from "./types";
import { byOrderName, useCollection } from "./use-collection";

type Props = {
  settings: AppSettings;
  rewards: RewardItem[];
  plans: PlanItem[];
  /** Cheapest active service included in plans, to show the plan's saving. */
  reference: { name: string; price: number } | null;
};

export function LoyaltyManager(props: Props) {
  return (
    <ToastProvider>
      <Loyalty {...props} />
    </ToastProvider>
  );
}

function Loyalty({ settings: initialSettings, rewards, plans, reference }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const latest = useRef(initialSettings);

  /** Saves a slice of settings on top of the last saved version (other sections stay untouched). */
  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const saved = await api<AppSettings>("/api/admin/settings", { method: "PUT", body: { ...latest.current, ...patch } });
    latest.current = saved;
    setSettings(saved);
    return saved;
  }, []);

  return (
    <>
      <AdminPageHeader title="Fidelidad" description="Tarjeta de sellos, regalos para canjear y planes de exclusividad." />
      <div className="flex flex-col gap-12">
        <LoyaltyRules settings={settings} onSave={(loyalty) => saveSettings({ loyalty })} />
        <Rewards initial={rewards} />
        <Plans
          initial={plans}
          currency={settings.currency}
          reference={reference}
          membershipEnabled={settings.membershipEnabled}
          onMembershipChange={async (membershipEnabled) => {
            setSettings((s) => ({ ...s, membershipEnabled }));
            try {
              await saveSettings({ membershipEnabled });
            } catch (e) {
              setSettings((s) => ({ ...s, membershipEnabled: !membershipEnabled }));
              throw e;
            }
          }}
        />
      </div>
    </>
  );
}

/* ───────────────────────── 1. Card rules ───────────────────────── */

type LoyaltyConfig = AppSettings["loyalty"];
type StepDraft = { key: number; position: string; percent: string; gift: boolean };

function toDraft(l: LoyaltyConfig) {
  return {
    enabled: l.enabled,
    cardSize: l.cardSize,
    steps: [...l.steps].sort((a, b) => a.position - b.position).map((s, i) => ({ key: i, position: String(s.position), percent: String(s.percent), gift: s.gift })),
  };
}

function LoyaltyRules({ settings, onSave }: { settings: AppSettings; onSave: (l: LoyaltyConfig) => Promise<unknown> }) {
  const toast = useToast();
  const [draft, setDraft] = useState(() => toDraft(settings.loyalty));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const keySeq = useRef(100);

  const parsed = draft.steps.map((s) => ({ position: Number(s.position), percent: num(s.percent), gift: s.gift }));
  const stepErrors = draft.steps.map((s, i) => {
    const p = parsed[i];
    if (!Number.isInteger(p.position) || p.position < 1 || p.position > draft.cardSize) return `Elegí un sello entre 1 y ${draft.cardSize}.`;
    if (parsed.findIndex((x) => x.position === p.position) !== i) return "Ya hay un beneficio en ese sello.";
    if (p.percent === null || !Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100) return "Descuento entre 0 y 100.";
    if (p.percent === 0 && !p.gift) return "Poné un descuento o marcá regalo.";
    return null;
  });
  const valid = stepErrors.every((e) => !e);
  const normalized: LoyaltyConfig = {
    enabled: draft.enabled,
    cardSize: draft.cardSize,
    steps: parsed
      .map((p) => ({ position: p.position, percent: p.percent ?? 0, gift: p.gift }))
      .sort((a, b) => a.position - b.position),
  };
  const dirty = JSON.stringify(normalized) !== JSON.stringify({ ...settings.loyalty, steps: [...settings.loyalty.steps].sort((a, b) => a.position - b.position) });

  function patchStep(key: number, patch: Partial<StepDraft>) {
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  }

  function addStep() {
    const used = new Set(parsed.map((p) => p.position));
    const pos = Array.from({ length: draft.cardSize }, (_, i) => i + 1).find((p) => !used.has(p)) ?? draft.cardSize;
    setDraft((d) => ({ ...d, steps: [...d.steps, { key: ++keySeq.current, position: String(pos), percent: "10", gift: false }] }));
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await onSave(normalized);
      setDraft(toDraft(normalized));
      toast("Reglas de la tarjeta guardadas.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <SectionHeading
        title="Reglas de la tarjeta"
        description="Cada turno completado suma un sello. En los sellos marcados el cliente obtiene un beneficio."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card className="flex flex-col gap-5 p-4 sm:p-5">
          <Toggle
            checked={draft.enabled}
            onChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
            label="Tarjeta de fidelidad activa"
          />

          <div className={cn("flex flex-col gap-5 transition-opacity duration-200", !draft.enabled && "opacity-50")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Sellos por tarjeta</p>
                <p className="mt-0.5 text-xs text-faint">Al completarla, empieza una nueva.</p>
              </div>
              <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft((d) => ({ ...d, cardSize: Math.max(2, d.cardSize - 1) }))}
                  disabled={draft.cardSize <= 2}
                  aria-label="Un sello menos"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                  {draft.cardSize}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft((d) => ({ ...d, cardSize: Math.min(30, d.cardSize + 1) }))}
                  disabled={draft.cardSize >= 30}
                  aria-label="Un sello más"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Beneficios</p>
              {draft.steps.length === 0 && <p className="text-sm text-faint">Sin beneficios: la tarjeta solo cuenta visitas.</p>}
              {draft.steps.map((s, i) => (
                <div key={s.key} className="animate-[fade_180ms_ease-out_both] rounded-2xl border border-line bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex items-center gap-2 text-sm text-dim">
                      Sello
                      <select
                        value={s.position}
                        onChange={(e) => patchStep(s.key, { position: e.target.value })}
                        className="h-10 rounded-xl border border-line bg-bg px-3 text-sm tabular-nums text-ink focus:border-ink focus:outline-none"
                      >
                        {Array.from({ length: Math.max(draft.cardSize, Number(s.position) || 1) }, (_, p) => (
                          <option key={p + 1} value={p + 1}>
                            N° {p + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-dim">
                      <span className="relative">
                        <input
                          inputMode="numeric"
                          value={s.percent}
                          onChange={(e) => patchStep(s.key, { percent: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                          aria-label="Porcentaje de descuento"
                          className="h-10 w-20 rounded-xl border border-line bg-bg pl-3 pr-7 text-sm tabular-nums text-ink focus:border-ink focus:outline-none"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">%</span>
                      </span>
                      off
                    </label>
                    <Toggle checked={s.gift} onChange={(gift) => patchStep(s.key, { gift })} label={<span className="text-dim">Regalo</span>} />
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, steps: d.steps.filter((x) => x.key !== s.key) }))}
                      className="ml-auto rounded-lg p-2 text-faint transition-colors hover:bg-white/5 hover:text-ink"
                      aria-label={`Quitar beneficio del sello ${s.position}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {stepErrors[i] && <p className="mt-2 text-xs text-bad">{stepErrors[i]}</p>}
                </div>
              ))}
              {draft.steps.length < draft.cardSize && (
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addStep}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Agregar beneficio
                </Button>
              )}
              <p className="text-xs text-faint">
                “Regalo”: al llegar a ese sello el cliente elige un regalo del catálogo de abajo (además del descuento, si tiene).
              </p>
            </div>
          </div>

          <ErrorText>{error}</ErrorText>
          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <span className={cn("mr-auto text-xs text-warn transition-opacity duration-200", dirty ? "opacity-100" : "opacity-0")} aria-live="polite">
              {dirty ? "Cambios sin guardar" : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(settings.loyalty))} disabled={!dirty || saving}>
              Descartar
            </Button>
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty || !valid}>
              Guardar reglas
            </Button>
          </div>
        </Card>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <StampCardPreview businessName={settings.businessName} cardSize={draft.cardSize} steps={normalized.steps} enabled={draft.enabled} />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 2. Rewards ───────────────────────── */

function Rewards({ initial }: { initial: RewardItem[] }) {
  const toast = useToast();
  const col = useCollection<RewardItem>("/api/admin/rewards", initial, byOrderName);
  const [editing, setEditing] = useState<RewardItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<RewardItem | null>(null);

  return (
    <section>
      <SectionHeading
        title="Regalos"
        description="Lo que el cliente puede elegir al llegar a un sello con regalo."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo regalo
          </Button>
        }
      />
      {col.items.length === 0 ? (
        <EmptyState title="No hay regalos cargados" icon={<Gift className="h-6 w-6" />}>
          Agregá al menos uno si tu tarjeta tiene sellos con regalo.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {col.items.map((r, i) => {
            const e = enter(i);
            const outOfStock = r.stock === 0;
            return (
              <Card key={r._id} style={e.style} className={cn(e.className, "flex gap-3 p-3 transition-opacity duration-200", !r.active && "opacity-60")}>
                <ImagePreview url={r.imageUrl} className="h-20 w-20 shrink-0 [&_img]:grayscale" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold">{r.name}</h3>
                    <ActiveSwitch
                      checked={r.active}
                      label={`${r.name} activo`}
                      onToggle={async (active) => {
                        await col.patchOptimistic(r._id, { active });
                        toast(active ? `“${r.name}” disponible para canjear.` : `“${r.name}” oculto.`);
                      }}
                    />
                  </div>
                  {r.description && <p className="line-clamp-2 text-xs text-dim">{r.description}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Pill tone={outOfStock ? "bad" : "neutral"} className="px-2 py-0 text-[11px]">
                      {r.stock === null ? "Ilimitado" : outOfStock ? "Sin stock" : `Stock: ${r.stock}`}
                    </Pill>
                    <div className="ml-auto flex">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(r)} aria-label={`Editar ${r.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleting(r)} aria-label={`Eliminar ${r.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CatalogModal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo regalo" : "Editar regalo"}>
        {editing !== null && (
          <RewardForm
            reward={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (editing === "new") await col.create(body);
              else await col.update(editing._id, body);
              setEditing(null);
              toast(editing === "new" ? "Regalo creado." : "Cambios guardados.");
            }}
          />
        )}
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar regalo"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await col.remove(deleting._id);
          toast(`“${deleting.name}” fue eliminado.`);
        }}
      >
        <p>
          ¿Eliminar <strong className="text-ink">“{deleting?.name}”</strong>? Los canjes ya hechos conservan el nombre del regalo.
        </p>
        <p>Si solo querés ocultarlo por un tiempo, desactivalo.</p>
      </ConfirmDialog>
    </section>
  );
}

function RewardForm({
  reward,
  onSave,
  onCancel,
}: {
  reward: RewardItem | null;
  onSave: (body: Omit<RewardItem, "_id" | "order">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(reward?.name ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl ?? "");
  const [unlimited, setUnlimited] = useState(reward ? reward.stock === null : true);
  const [stock, setStock] = useState(reward?.stock != null ? String(reward.stock) : "10");
  const [active, setActive] = useState(reward?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresá el nombre.";
    if (imageUrl.trim() && !isHttpUrl(imageUrl.trim())) errs.imageUrl = "Tiene que ser un link que empiece con https://";
    const stockN = num(stock);
    if (!unlimited && (stockN === null || !Number.isInteger(stockN) || stockN < 0)) errs.stock = "Cantidad entera (0 o más).";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        stock: unlimited ? null : (stockN as number),
        active,
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
        {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="Cera para peinar" aria-invalid={!!errors.name} />}
      </Field>
      <Field label="Descripción" hint={<CharCount value={description} max={300} />}>
        {(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />}
      </Field>
      <div className="flex items-start gap-4">
        <Field label="Imagen (URL)" error={errors.imageUrl} className="flex-1">
          {(id) => (
            <Input id={id} type="url" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" aria-invalid={!!errors.imageUrl} />
          )}
        </Field>
        <ImagePreview url={imageUrl.trim()} className="mt-6 h-20 w-20 shrink-0 [&_img]:grayscale" />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <Toggle checked={unlimited} onChange={setUnlimited} label="Stock ilimitado" />
        {!unlimited && (
          <Field label="Unidades disponibles" error={errors.stock} hint="Se descuenta una por cada canje." className="animate-[fade_160ms_ease-out_both]">
            {(id) => (
              <Input id={id} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} className="w-32 tabular-nums" aria-invalid={!!errors.stock} />
            )}
          </Field>
        )}
      </div>
      <Toggle checked={active} onChange={setActive} label="Activo (se puede elegir)" />
      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel={reward ? "Guardar cambios" : "Crear regalo"} />
    </form>
  );
}

/* ───────────────────────── 3. Plans ───────────────────────── */

function perCut(price: number, cuts: number) {
  return cuts > 0 ? Math.round(price / cuts) : 0;
}

function Plans({
  initial,
  currency,
  reference,
  membershipEnabled,
  onMembershipChange,
}: {
  initial: PlanItem[];
  currency: string;
  reference: Props["reference"];
  membershipEnabled: boolean;
  onMembershipChange: (v: boolean) => Promise<void>;
}) {
  const toast = useToast();
  const col = useCollection<PlanItem>("/api/admin/plans", initial, byOrderName);
  const [editing, setEditing] = useState<PlanItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<PlanItem | null>(null);

  return (
    <section>
      <SectionHeading
        title="Planes de exclusividad"
        description="Abonos mensuales: el cliente paga por adelantado y reserva sin cargo los servicios incluidos."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo plan
          </Button>
        }
      />

      <Card className="mb-4 flex flex-col gap-1 p-4">
        <Toggle
          checked={membershipEnabled}
          onChange={(v) => {
            onMembershipChange(v)
              .then(() => toast(v ? "Planes de exclusividad activados." : "Planes de exclusividad desactivados."))
              .catch((e) => toast(errorMessage(e, "No se pudo cambiar la configuración."), "bad"));
          }}
          label="Planes de exclusividad habilitados"
        />
        <p className="pl-14 text-xs text-faint">
          {membershipEnabled ? "Los clientes con plan activo no pagan los servicios incluidos." : "Desactivado: nadie recibe el beneficio del plan, aunque lo tenga asignado."}
        </p>
      </Card>

      {col.items.length === 0 ? (
        <EmptyState title="No hay planes" icon={<Crown className="h-6 w-6" />}>
          Ejemplo: “Plan Ram” · 4 cortes por mes.
        </EmptyState>
      ) : (
        <div className={cn("grid gap-3 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3", !membershipEnabled && "opacity-60")}>
          {col.items.map((p, i) => {
            const e = enter(i);
            const unit = perCut(p.price, p.cuts);
            const saving = reference && reference.price > 0 ? Math.round((1 - unit / reference.price) * 100) : null;
            return (
              <Card key={p._id} style={e.style} className={cn(e.className, "flex flex-col gap-3 p-4 transition-opacity duration-200", !p.active && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 truncate font-semibold">
                      <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-dim">
                      {p.cuts} {p.cuts === 1 ? "corte" : "cortes"} por mes
                    </p>
                  </div>
                  <ActiveSwitch
                    checked={p.active}
                    label={`${p.name} activo`}
                    onToggle={async (active) => {
                      await col.patchOptimistic(p._id, { active });
                      toast(active ? `“${p.name}” activo.` : `“${p.name}” desactivado.`);
                    }}
                  />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{formatPrice(p.price, currency)}</p>
                  <p className="text-xs tabular-nums text-dim">
                    {formatPrice(unit, currency)} por corte
                    {saving !== null && saving > 0 && reference && (
                      <span className="text-ok"> · {saving}% menos que {reference.name}</span>
                    )}
                  </p>
                </div>
                {p.description && <p className="text-sm text-dim">{p.description}</p>}
                <div className="mt-auto flex gap-2">
                  <Button variant="subtle" size="sm" className="flex-1" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(p)} aria-label={`Eliminar ${p.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CatalogModal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo plan" : "Editar plan"}>
        {editing !== null && (
          <PlanForm
            plan={editing === "new" ? null : editing}
            currency={currency}
            reference={reference}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (editing === "new") await col.create(body);
              else await col.update(editing._id, body);
              setEditing(null);
              toast(editing === "new" ? "Plan creado." : "Cambios guardados.");
            }}
          />
        )}
      </CatalogModal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar plan"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await col.remove(deleting._id);
          toast(
            result === "deleted" ? `“${deleting.name}” fue eliminado.` : `Hay clientes con “${deleting.name}”: lo desactivamos en lugar de borrarlo.`,
            result === "deleted" ? "ok" : "warn",
          );
        }}
      >
        <p>
          ¿Eliminar <strong className="text-ink">“{deleting?.name}”</strong>?
        </p>
        <p>Si algún cliente lo tiene asignado no se borra: queda desactivado.</p>
      </ConfirmDialog>
    </section>
  );
}

function PlanForm({
  plan,
  currency,
  reference,
  onSave,
  onCancel,
}: {
  plan: PlanItem | null;
  currency: string;
  reference: Props["reference"];
  onSave: (body: Omit<PlanItem, "_id" | "order">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [cuts, setCuts] = useState(String(plan?.cuts ?? 4));
  const [price, setPrice] = useState(plan ? String(plan.price) : "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [active, setActive] = useState(plan?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const cutsN = num(cuts);
  const priceN = num(price);
  const unit = cutsN && cutsN > 0 && priceN !== null ? perCut(priceN, cutsN) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresá el nombre.";
    if (cutsN === null || !Number.isInteger(cutsN) || cutsN < 1 || cutsN > 60) errs.cuts = "Entre 1 y 60 cortes.";
    if (priceN === null || priceN < 0) errs.price = "Ingresá un precio válido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setFormError("");
    try {
      await onSave({ name: name.trim(), cuts: cutsN as number, price: priceN as number, description: description.trim(), active });
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
        {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="Plan Ram" aria-invalid={!!errors.name} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cortes por mes" error={errors.cuts}>
          {(id) => <Input id={id} inputMode="numeric" value={cuts} onChange={(e) => setCuts(e.target.value.replace(/\D/g, ""))} className="tabular-nums" aria-invalid={!!errors.cuts} />}
        </Field>
        <Field label={`Precio mensual (${currency})`} error={errors.price}>
          {(id) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim">$</span>
              <Input id={id} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="pl-8 tabular-nums" placeholder="48000" aria-invalid={!!errors.price} />
            </div>
          )}
        </Field>
      </div>
      <div className="flex items-baseline justify-between rounded-2xl border border-line bg-surface px-4 py-3" aria-live="polite">
        <span className="text-sm text-dim">Precio por corte</span>
        <span className="text-right">
          <span className="text-lg font-semibold tabular-nums">{unit !== null ? formatPrice(unit, currency) : "—"}</span>
          {unit !== null && reference && reference.price > 0 && unit < reference.price && (
            <span className="block text-xs text-ok">
              {Math.round((1 - unit / reference.price) * 100)}% menos que {reference.name} ({formatPrice(reference.price, currency)})
            </span>
          )}
        </span>
      </div>
      <Field label="Descripción" hint={<CharCount value={description} max={300} />}>
        {(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Qué incluye, condiciones…" />}
      </Field>
      <Toggle checked={active} onChange={setActive} label="Activo (se ofrece a clientes)" />
      <ErrorText>{formError}</ErrorText>
      <FormActions onCancel={onCancel} saving={saving} submitLabel={plan ? "Guardar cambios" : "Crear plan"} />
    </form>
  );
}
