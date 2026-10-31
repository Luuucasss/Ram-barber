"use client";

import { useState } from "react";
import { CalendarDays, Clock, MapPin, Scissors, User } from "lucide-react";
import { Button, ErrorText, Field, Input, Textarea } from "@/components/ui";
import { Rose } from "@/components/ornaments";
import { formatDateLong, formatDuration, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { Pricing } from "./ChoiceSteps";

export type Summary = {
  service: string;
  durationMin: number;
  barber: string;
  branch: string | null;
  date: string;
  time: string;
  price: number;
  pricing: Pricing;
  currency: string;
};

export function SummaryCard({ summary, phone }: { summary: Summary; phone?: string }) {
  const rows = [
    { icon: Scissors, label: "Servicio", value: `${summary.service} · ${formatDuration(summary.durationMin)}` },
    { icon: User, label: "Barbero", value: summary.barber },
    ...(summary.branch ? [{ icon: MapPin, label: "Sucursal", value: summary.branch }] : []),
    { icon: CalendarDays, label: "Día", value: formatDateLong(summary.date) },
    { icon: Clock, label: "Hora", value: `${summary.time} hs` },
  ];
  const discounted = summary.pricing.final < summary.price;
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-card">
      <Rose size={120} tone="dark" className="pointer-events-none absolute -right-8 -top-8 opacity-30" />
      <dl className="relative divide-y divide-line px-5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-3.5">
            <r.icon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
            <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-dim">{r.label}</dt>
            <dd className="min-w-0 flex-1 text-right font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {/* Ticket perforation */}
      <div className="relative flex items-center" aria-hidden="true">
        <span className="-ml-3 h-6 w-6 rounded-full border border-line-strong bg-bg" />
        <span className="mx-2 h-px flex-1 border-t border-dashed border-line-strong" />
        <span className="-mr-3 h-6 w-6 rounded-full border border-line-strong bg-bg" />
      </div>
      <div className="relative flex items-end justify-between gap-4 px-5 pb-5 pt-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Total</p>
          {summary.pricing.label && <p className="mt-1 text-xs text-ink">{summary.pricing.label}</p>}
          {phone && <p className="mt-1 text-xs tabular-nums text-faint">A nombre de {formatPhone(phone)}</p>}
        </div>
        <div className="text-right tabular-nums">
          {discounted && <s className="block text-sm text-faint">{formatPrice(summary.price, summary.currency)}</s>}
          <span className="font-gothic text-4xl leading-none">
            {summary.pricing.final === 0 && discounted ? "Sin cargo" : formatPrice(summary.pricing.final, summary.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConfirmStep({
  summary,
  phone,
  name,
  notes,
  cancelLimitHours,
  submitting,
  error,
  onName,
  onNotes,
  onConfirm,
}: {
  summary: Summary;
  phone: string;
  name: string;
  notes: string;
  cancelLimitHours: number;
  submitting: boolean;
  error: React.ReactNode;
  onName: (v: string) => void;
  onNotes: (v: string) => void;
  onConfirm: () => void;
}) {
  const [nameError, setNameError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError("Ingresá tu nombre (mínimo 2 letras).");
      return;
    }
    setNameError(null);
    onConfirm();
  }

  return (
    <form onSubmit={submit} noValidate className="rb-stagger flex flex-col gap-5">
      <div style={{ "--i": 0 } as React.CSSProperties}>
        <SummaryCard summary={summary} phone={phone} />
      </div>
      <div style={{ "--i": 1 } as React.CSSProperties}>
        <Field label="Tu nombre" error={nameError ?? undefined}>
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => {
                onName(e.target.value);
                if (nameError) setNameError(null);
              }}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Nombre y apellido"
              maxLength={60}
              aria-invalid={Boolean(nameError)}
              required
            />
          )}
        </Field>
      </div>
      <div style={{ "--i": 2 } as React.CSSProperties}>
        <Field label="Notas (opcional)" hint="¿Algo que tengamos que saber? Ej: traigo foto de referencia.">
          {(id) => (
            <Textarea id={id} value={notes} onChange={(e) => onNotes(e.target.value)} maxLength={300} rows={2} />
          )}
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div style={{ "--i": 3 } as React.CSSProperties} className="flex flex-col gap-3">
        <Button type="submit" size="lg" block loading={submitting}>
          {submitting ? "Reservando…" : "Confirmar turno"}
        </Button>
        {cancelLimitHours > 0 && (
          <p className="text-center text-xs text-faint">
            Podés cancelar o reprogramar online hasta {cancelLimitHours} {cancelLimitHours === 1 ? "hora" : "horas"} antes.
          </p>
        )}
      </div>
    </form>
  );
}
