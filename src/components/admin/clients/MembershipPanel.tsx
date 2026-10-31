"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, RefreshCw } from "lucide-react";
import { ConfirmButton } from "@/components/admin/bookings/ConfirmButton";
import { numericDate } from "@/components/admin/bookings/fmt";
import { Button, Card, Field, Input, Pill, Select } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { addDays } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ClientFull, PlanItem } from "./types";

export type MembershipBody = { active: boolean; planId?: string; cutsRemaining?: number; validUntil?: string };

export function MembershipPanel({
  membership: m,
  plans,
  enabled,
  today,
  currency,
  busy,
  onSave,
}: {
  membership: ClientFull["membership"];
  plans: PlanItem[];
  enabled: boolean;
  today: string;
  currency: string;
  busy: string | null;
  onSave: (body: MembershipBody, tag: string) => Promise<boolean>;
}) {
  const hasPlan = m.active && Boolean(m.planId);
  const expired = hasPlan && Boolean(m.validUntil) && m.validUntil < today;
  const empty = hasPlan && m.cutsRemaining <= 0;
  const [assigning, setAssigning] = useState(!hasPlan);

  // Edit form for an existing membership.
  const [cuts, setCuts] = useState(String(m.cutsRemaining));
  const [until, setUntil] = useState(m.validUntil);
  useEffect(() => {
    setCuts(String(m.cutsRemaining));
    setUntil(m.validUntil);
    setAssigning(!(m.active && m.planId));
  }, [m.cutsRemaining, m.validUntil, m.active, m.planId]);
  const dirty = hasPlan && (Number(cuts) !== m.cutsRemaining || until !== m.validUntil);

  // Assign form.
  const [planId, setPlanId] = useState("");
  const plan = plans.find((p) => p._id === planId);
  const [newCuts, setNewCuts] = useState("");
  const [newUntil, setNewUntil] = useState("");
  const defaultUntil = addDays(today, 30);

  const current = plans.find((p) => p._id === m.planId);
  const status = !hasPlan
    ? { tone: "neutral" as const, label: "Sin membresía" }
    : expired
      ? { tone: "warn" as const, label: "Vencida" }
      : empty
        ? { tone: "warn" as const, label: "Sin cortes" }
        : { tone: "ok" as const, label: "Activa" };

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Membresía
          </h2>
          {!enabled && <p className="mt-0.5 text-xs text-warn">Las membresías están desactivadas en Configuración.</p>}
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      {hasPlan && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{m.planName}</p>
              <p className="text-sm text-dim">
                {m.validUntil ? `${expired ? "Venció" : "Vence"} el ${numericDate(m.validUntil)}` : "Sin vencimiento"}
              </p>
            </div>
            <p className="text-right">
              <span className="text-3xl font-semibold tabular-nums">{m.cutsRemaining}</span>
              <span className="text-sm text-dim tabular-nums">/{m.cutsPerPeriod}</span>
              <span className="block text-xs text-faint">cortes restantes</span>
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full origin-left rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `scaleX(${m.cutsPerPeriod ? Math.min(1, m.cutsRemaining / m.cutsPerPeriod) : 0})` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cortes restantes">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  max={999}
                  inputMode="numeric"
                  value={cuts}
                  onChange={(e) => setCuts(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              )}
            </Field>
            <Field label="Vence">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="h-10 rounded-xl px-3 text-sm"
                />
              )}
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {dirty && (
              <Button
                size="sm"
                onClick={() =>
                  onSave({ active: true, cutsRemaining: Math.max(0, Math.round(Number(cuts) || 0)), validUntil: until }, "edit")
                }
                loading={busy === "edit"}
                disabled={!!busy}
              >
                Guardar cambios
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => m.planId && onSave({ active: true, planId: m.planId }, "renew")}
              loading={busy === "renew"}
              disabled={!!busy}
              title={`Reinicia a ${m.cutsPerPeriod} cortes y vence en 30 días`}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Renovar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAssigning((v) => !v)} disabled={!!busy}>
              Cambiar plan
            </Button>
            <ConfirmButton
              size="sm"
              variant="ghost"
              className="ml-auto"
              onConfirm={() => onSave({ active: false }, "off")}
              loading={busy === "off"}
              disabled={!!busy}
              confirmLabel="¿Desactivar?"
            >
              Desactivar
            </ConfirmButton>
          </div>
          <p className="-mt-2 text-xs text-faint">
            Renovar reinicia a {m.cutsPerPeriod} cortes y vence el {numericDate(defaultUntil)}
            {current ? ` · ${formatPrice(current.price, currency)}` : ""}.
          </p>
        </div>
      )}

      {assigning &&
        (plans.length ? (
          <form
            className={cn("flex flex-col gap-3", hasPlan && "border-t border-line pt-4")}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!planId) return;
              const ok = await onSave(
                {
                  active: true,
                  planId,
                  ...(newCuts !== "" ? { cutsRemaining: Math.max(0, Math.round(Number(newCuts) || 0)) } : {}),
                  ...(newUntil ? { validUntil: newUntil } : {}),
                },
                "assign",
              );
              if (ok) {
                setPlanId("");
                setNewCuts("");
                setNewUntil("");
              }
            }}
          >
            <Field label={hasPlan ? "Nuevo plan" : "Asignar plan"}>
              {(id) => (
                <Select id={id} value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-10 rounded-xl text-sm">
                  <option value="">Elegí un plan…</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {p.cuts} cortes · {formatPrice(p.price, currency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {plan && (
              <div className="grid grid-cols-2 gap-3 animate-fade">
                <Field label="Cortes">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={999}
                      inputMode="numeric"
                      placeholder={String(plan.cuts)}
                      value={newCuts}
                      onChange={(e) => setNewCuts(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  )}
                </Field>
                <Field label="Vence">
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={newUntil || defaultUntil}
                      onChange={(e) => setNewUntil(e.target.value)}
                      className="h-10 rounded-xl px-3 text-sm"
                    />
                  )}
                </Field>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!planId || !!busy} loading={busy === "assign"}>
                {hasPlan ? "Cambiar plan" : "Asignar"}
              </Button>
              {hasPlan && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAssigning(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        ) : (
          <p className="text-sm text-dim">
            No hay planes activos.{" "}
            <Link href="/admin/fidelidad" className="text-ink underline underline-offset-2">
              Crear un plan
            </Link>
          </p>
        ))}
    </Card>
  );
}
