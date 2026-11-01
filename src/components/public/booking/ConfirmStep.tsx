"use client";

import { useCallback, useRef, useState } from "react";
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
  const rows: { icon: typeof Scissors; label: string; value: string; sub?: string }[] = [
    { icon: Scissors, label: "Servicio", value: summary.service, sub: formatDuration(summary.durationMin) },
    { icon: User, label: "Barbero", value: summary.barber },
    ...(summary.branch ? [{ icon: MapPin, label: "Sucursal", value: summary.branch }] : []),
    { icon: CalendarDays, label: "Día", value: formatDateLong(summary.date) },
    { icon: Clock, label: "Hora", value: `${summary.time} hs` },
  ];
  const discounted = summary.pricing.final < summary.price;
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-card">
      {/* Ticket header: the rose lives in its own band, so it can never sit on top of the details below. */}
      <div className="relative flex h-14 items-center justify-between gap-3 overflow-hidden border-b border-line pl-5 pr-4" aria-hidden="true">
        <span className="font-gothic text-2xl leading-none text-dim">Tu turno</span>
        <span className="flex items-center gap-2 text-line-strong">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-line-strong sm:w-14" />
          <Rose size={30} tone="light" className="opacity-80" />
        </span>
      </div>
      <dl className="relative divide-y divide-line px-5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 py-3.5">
            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
            <dt className="w-[4.75rem] shrink-0 pt-px text-xs font-medium uppercase tracking-[0.12em] text-dim sm:w-20 sm:tracking-[0.14em]">
              {r.label}
            </dt>
            <dd className="min-w-0 flex-1 text-right font-medium leading-snug [overflow-wrap:anywhere]">
              {r.value}
              {r.sub && <span className="mt-0.5 block text-xs font-normal text-dim">{r.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {/* Ticket perforation */}
      <div className="relative flex items-center" aria-hidden="true">
        <span className="-ml-3 h-6 w-6 rounded-full border border-line-strong bg-bg" />
        <span className="mx-2 h-px flex-1 border-t border-dashed border-line-strong" />
        <span className="-mr-3 h-6 w-6 rounded-full border border-line-strong bg-bg" />
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pb-5 pt-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Total</p>
          {summary.pricing.label && <p className="mt-1 text-xs text-ink">{summary.pricing.label}</p>}
          {phone && <p className="mt-1 text-xs tabular-nums text-faint">A nombre de {formatPhone(phone)}</p>}
        </div>
        <div className="ml-auto shrink-0 text-right tabular-nums">
          {discounted && <s className="block text-sm text-faint">{formatPrice(summary.price, summary.currency)}</s>}
          <span className="font-gothic whitespace-nowrap text-[2rem] leading-none sm:text-4xl">
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
  const nameRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const centering = useRef(false);

  /** Scrolls `el` so it sits clear of the sticky confirm bar (phones only; the bar is static from `sm`). */
  const keepClearOfBar = useCallback((el: HTMLElement, center = false) => {
    const bar = barRef.current;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (center) {
      el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
      return;
    }
    if (!bar || getComputedStyle(bar).position !== "sticky") return;
    // Measure the button's band, not the gradient fade above it.
    const barTop = (bar.querySelector("button") ?? bar).getBoundingClientRect().top;
    const { top, bottom } = el.getBoundingClientRect();
    const overlap = bottom + 16 - barTop;
    if (overlap > 0) window.scrollBy({ top: Math.min(overlap, Math.max(0, top - 16)), behavior: smooth ? "smooth" : "auto" });
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError("Ingresá tu nombre (mínimo 2 letras).");
      // On short phones the field (and this error) can sit behind the sticky bar: bring it up and focus it.
      const input = nameRef.current;
      if (input) {
        centering.current = true;
        input.focus({ preventScroll: true });
        centering.current = false;
        requestAnimationFrame(() => keepClearOfBar(input, true));
      }
      return;
    }
    setNameError(null);
    onConfirm();
  }

  function onFieldFocus(e: React.FocusEvent<HTMLFormElement>) {
    const t = e.target;
    if (centering.current || !(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    // Wait a beat: the on-screen keyboard resizes the viewport right after focus.
    window.setTimeout(() => keepClearOfBar(t), 120);
  }

  return (
    // scroll-mb keeps a focused field from scrolling in under the sticky confirm bar on phones;
    // onFieldFocus covers the case where the browser thinks the field is already in view.
    <form
      onSubmit={submit}
      onFocus={onFieldFocus}
      noValidate
      className="rb-stagger flex flex-col gap-5 [&_input]:scroll-mb-32 [&_textarea]:scroll-mb-32"
    >
      <div style={{ "--i": 0 } as React.CSSProperties}>
        <SummaryCard summary={summary} phone={phone} />
      </div>
      <div style={{ "--i": 1 } as React.CSSProperties}>
        <Field label="Tu nombre" error={nameError ?? undefined}>
          {(id) => (
            <Input
              ref={nameRef}
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
      {/* Phones: the confirm button sticks to the bottom of the form (thumb zone, clear of the home indicator). */}
      <div
        ref={barRef}
        style={{ "--i": 3 } as React.CSSProperties}
        className="sticky bottom-0 z-10 -mx-4 -mt-5 bg-gradient-to-t from-bg from-65% to-transparent px-4 pt-7 pb-safe sm:static sm:mx-0 sm:mt-0 sm:bg-none sm:p-0"
      >
        <Button type="submit" size="lg" block loading={submitting}>
          {submitting ? "Reservando…" : "Confirmar turno"}
        </Button>
      </div>
      {cancelLimitHours > 0 && (
        <p style={{ "--i": 4 } as React.CSSProperties} className="-mt-4 text-center text-xs text-faint sm:-mt-2">
          Podés cancelar o reprogramar online hasta {cancelLimitHours} {cancelLimitHours === 1 ? "hora" : "horas"} antes.
        </p>
      )}
    </form>
  );
}
