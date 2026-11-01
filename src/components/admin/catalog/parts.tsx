"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ImageOff, Loader2 } from "lucide-react";
import { Button, ErrorText, Modal, Toggle } from "@/components/ui";
import { ApiClientError } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

/* ───────────────────────── motion ───────────────────────── */

export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

/** Quick list entrance (260ms, 40ms stagger capped) — snappier than the public site's reveal. */
export function enter(i: number): { className: string; style: React.CSSProperties } {
  return {
    className: "animate-[reveal_260ms_cubic-bezier(0.23,1,0.32,1)_both]",
    style: { animationDelay: `${Math.min(i, 8) * 40}ms` },
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * FLIP for reorderable lists: when a keyed row changes position it slides from its old spot.
 * Uses offsetTop (immune to page scroll) and WAAPI (transform only, off the main thread).
 * The list container must be `position: relative`.
 */
export function useFlip(keys: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());
  const signature = keys.join("|");
  const lastSignature = useRef(signature);

  // Runs after every render so positions never go stale; only animates when the order changed.
  useLayoutEffect(() => {
    const reordered = lastSignature.current !== signature;
    lastSignature.current = signature;
    const reduce = prefersReducedMotion();
    const next = new Map<string, number>();
    nodes.current.forEach((el, key) => {
      const top = el.offsetTop;
      next.set(key, top);
      const prev = tops.current.get(key);
      if (!reordered || reduce || prev === undefined) return;
      const dy = prev - top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
        duration: 240,
        easing: EASE_IN_OUT,
      });
    });
    tops.current = next;
  });

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}

/* ───────────────────────── errors ───────────────────────── */

export function errorMessage(e: unknown, fallback = "No se pudo guardar. Probá de nuevo."): string {
  if (e instanceof ApiClientError) return e.message;
  return fallback;
}

/** First message per field from a zod `flatten()` payload returned by the API. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiClientError) || !e.issues || typeof e.issues !== "object") return {};
  const fe = (e.issues as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors ?? {};
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? "Valor inválido"]));
}

/**
 * After a failed submit, bring the first invalid field (or error message) into view and focus it.
 * Long sheets on phones otherwise leave the error far above the thumb, so the submit "does nothing".
 */
export function revealFirstError(root: HTMLElement | null) {
  if (!root) return;
  // Wait for React to commit the error messages / aria-invalid flags (state updates flush in a microtask).
  setTimeout(() => {
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    if (!el) return;
    if (el.matches("input, textarea, select, button")) el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, 0);
}

export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ───────────────────────── media ───────────────────────── */

/** Round avatar: photo when it loads, otherwise the initial in blackletter. */
export function Avatar({ name, url, size = 56, className }: { name: string; url?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImg = Boolean(url) && failed !== url;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-card-2",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover grayscale"
          onError={() => setFailed(url ?? null)}
          draggable={false}
        />
      ) : (
        <span className="font-gothic leading-none text-ink" style={{ fontSize: size * 0.5 }} aria-hidden="true">
          {initial}
        </span>
      )}
    </span>
  );
}

/** Rectangular preview for an image URL with explicit empty / broken states. */
export function ImagePreview({ url, className, label = "Vista previa" }: { url: string; className?: string; label?: string }) {
  const [state, setState] = useState<{ url: string; status: "loading" | "ok" | "error" }>({ url, status: "loading" });
  const status = state.url === url ? state.status : "loading";
  const valid = isHttpUrl(url) || url.startsWith("/");
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface text-faint",
        className,
      )}
      aria-label={label}
    >
      {url && valid ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt=""
            onLoad={() => setState({ url, status: "ok" })}
            onError={() => setState({ url, status: "error" })}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-200",
              status === "ok" ? "opacity-100" : "opacity-0",
            )}
          />
          {status === "loading" && <Loader2 className="absolute h-5 w-5 animate-spin" aria-hidden="true" />}
          {status === "error" && (
            <span className="absolute flex flex-col items-center gap-1 px-2 text-center text-[11px]">
              <ImageOff className="h-5 w-5" aria-hidden="true" />
              No carga
            </span>
          )}
        </>
      ) : (
        <ImageOff className="h-5 w-5" aria-hidden="true" />
      )}
    </div>
  );
}

/* ───────────────────────── modal & forms ───────────────────────── */

/**
 * Phone layout for the shared <dialog>: a full-width bottom sheet (thumb reach, more room for long
 * forms), taller cap, and a 44px close button. Desktop (sm+) keeps the centered card.
 * Short viewports (a phone in landscape) get a bottom-anchored sheet that may use the full height
 * and a slimmer header, so the scroll area between the header and the sticky footer stays usable.
 */
const SHEET_ON_PHONE = cn(
  "max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
  "max-sm:[&>div]:max-h-[92dvh]",
  "[@media(max-height:540px)]:mb-0 [@media(max-height:540px)]:max-h-dvh [@media(max-height:540px)]:rounded-b-none [@media(max-height:540px)]:border-b-0",
  "[@media(max-height:540px)]:[&>div]:max-h-dvh [@media(max-height:540px)]:[&>div>div:first-child]:py-0.5",
  "[&_[aria-label=Cerrar]]:-mr-2 [&_[aria-label=Cerrar]]:inline-flex [&_[aria-label=Cerrar]]:min-h-11 [&_[aria-label=Cerrar]]:min-w-11 [&_[aria-label=Cerrar]]:items-center [&_[aria-label=Cerrar]]:justify-center",
);

/** App Modal with a faster (260ms, strong ease-out) entrance. Children mount only while open. */
export function CatalogModal({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className={cn("open:animate-[reveal_260ms_cubic-bezier(0.23,1,0.32,1)_both]", wide ? "max-w-2xl" : "max-w-lg", SHEET_ON_PHONE)}
    >
      {open ? children : null}
    </Modal>
  );
}

/** Sticky footer for forms inside CatalogModal (cancels the modal body padding). */
export function FormActions({
  onCancel,
  saving,
  submitLabel = "Guardar",
  extra,
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-card/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:pb-4 [@media(max-height:540px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] [@media(max-height:540px)]:pt-2">
      {extra && <div className="mr-auto">{extra}</div>}
      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="max-sm:flex-1">
        Cancelar
      </Button>
      <Button type="submit" loading={saving} className="max-sm:flex-[2]">
        {submitLabel}
      </Button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(errorMessage(e, "No se pudo completar la acción."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <CatalogModal open={open} onClose={() => !busy && onClose()} title={title}>
      <div className="flex flex-col gap-4 max-sm:pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-3 text-sm text-dim">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-2 break-words">{children}</div>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy} className="max-sm:flex-1">
            Cancelar
          </Button>
          <Button variant="primary" onClick={run} loading={busy} className="max-sm:flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </CatalogModal>
  );
}

/** Multi-select as toggle chips with an "all" chip that means "no restriction" (empty list). */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  allLabel,
  emptyText = "No hay opciones cargadas.",
}: {
  options: { id: string; label: string; hint?: string; muted?: boolean }[];
  value: string[];
  onChange: (v: string[]) => void;
  allLabel: string;
  emptyText?: string;
}) {
  if (!options.length) return <p className="text-sm text-faint">{emptyText}</p>;
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-11 max-w-full select-none items-center gap-1.5 rounded-full border px-4 text-sm sm:pointer-fine:h-9 sm:pointer-fine:px-3.5 transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]",
      active ? "border-ink bg-ink font-medium text-bg" : "border-line-strong text-dim hover:border-ink hover:text-ink",
    );
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={value.length === 0} className={chip(value.length === 0)} onClick={() => onChange([])}>
        {allLabel}
      </button>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            className={cn(chip(on), o.muted && !on && "opacity-60")}
            onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
          >
            {o.label}
            {o.hint && <span className={cn("text-xs", on ? "text-bg/70" : "text-faint")}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Active switch with optimistic update + toast on failure. */
export function ActiveSwitch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => Promise<void>;
  label: string;
}) {
  const toast = useToast();
  return (
    // The label wraps the switch, so padding it out gives a 44px tap target without changing the look.
    // Only the vertical slack is pulled back (the switch is already 44px wide), so it never hugs the card edge.
    <span
      className="-my-2.5 inline-flex shrink-0 items-center [&>label]:min-h-11 [&>label]:min-w-11 [&>label]:justify-center [&>label]:gap-0 sm:pointer-fine:my-0 sm:pointer-fine:[&>label]:min-h-0 sm:pointer-fine:[&>label]:min-w-0"
      title={checked ? "Activo" : "Inactivo"}
    >
      <Toggle
        checked={checked}
        label={<span className="sr-only">{label}</span>}
        onChange={(next) => {
          onToggle(next).catch((e) => toast(errorMessage(e, "No se pudo cambiar el estado."), "bad"));
        }}
      />
    </span>
  );
}

/** Labeled switch for forms: same look as Toggle, but the whole row is a 44px-tall tap target. */
export function FormToggle(props: React.ComponentProps<typeof Toggle>) {
  return (
    <div className="flex [&>label]:min-h-11">
      <Toggle {...props} />
    </div>
  );
}

export function SectionHeading({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-dim">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("tabular-nums", value.length > max ? "font-semibold text-ink" : "text-faint")}>
      {value.length}/{max}
    </span>
  );
}

/** Parses a form number field; returns null when empty / not a number. */
export function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
