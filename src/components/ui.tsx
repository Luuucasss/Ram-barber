"use client";

import { forwardRef, useEffect, useId, useRef } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-bg hover:bg-white shadow-[0_0_0_1px_var(--color-ink),0_10px_30px_-10px_rgba(255,255,255,0.35)] hover:shadow-[0_0_0_1px_#fff,0_14px_40px_-10px_rgba(255,255,255,0.5)]",
  outline: "border border-line-strong text-ink hover:border-ink hover:bg-white/5",
  ghost: "text-dim hover:text-ink hover:bg-white/5",
  // Monochrome identity: destructive actions read through the dashed border, not red.
  danger: "border border-dashed border-ink/50 text-ink hover:bg-white/5 hover:border-solid hover:border-ink",
  subtle: "bg-card-2 text-ink hover:bg-line border border-line",
};
// `max-sm:min-*` keeps every button a >=44px tap target on phones without touching desktop sizing
// (min-height wins over any `h-*` a caller passes, and only below the `sm` breakpoint).
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5 max-sm:min-h-11 pointer-coarse:min-h-11",
  md: "h-11 px-5 text-sm rounded-2xl gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2",
  icon: "h-10 w-10 rounded-xl max-sm:min-h-11 max-sm:min-w-11 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-card", className)} {...props} />;
}

// text-base (16px) on purpose: anything smaller makes iOS Safari zoom the page on focus.
const fieldBase =
  "w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-faint transition-colors focus:border-ink focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-ink aria-[invalid=true]:shadow-[0_0_0_1px_var(--color-ink)]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-3", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  // Chevron is a CSS background (.select-chevron) so callers' layout classes still hit the <select> itself.
  return (
    <select ref={ref} className={cn(fieldBase, "select-chevron h-12 appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
});

/** Label + control + hint/error. Pass a render function to get the generated id. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.14em] text-dim">
          {label}
        </label>
      )}
      {children(id)}
      {error ? (
        // Black & white identity: errors read through weight + icon, not red.
        <p className="flex items-start gap-1.5 text-xs font-medium text-ink" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 max-sm:min-h-11 pointer-coarse:min-h-11", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors",
          checked ? "border-ink bg-ink" : "border-line-strong bg-card-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all",
            checked ? "left-[22px] bg-bg" : "left-0.5 bg-dim",
          )}
        />
      </button>
      {label && (
        <span id={labelId} className="text-sm text-ink">
          {label}
        </span>
      )}
    </label>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-dim", className)} role="status">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

type PillTone = "neutral" | "ok" | "bad" | "warn" | "ink";
const pillTones: Record<PillTone, string> = {
  neutral: "border-line-strong text-dim",
  // Black & white only: tones differ by border style and weight instead of hue.
  ok: "border-ink/70 text-ink",
  bad: "border-dashed border-line-strong text-faint",
  warn: "border-dotted border-ink/60 text-ink",
  ink: "border-ink bg-ink text-bg",
};

export function Pill({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        pillTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function ErrorText({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn("flex items-start gap-2 rounded-xl border border-ink/50 bg-card-2 px-3 py-2 text-sm text-ink", className)}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-1 text-faint">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="text-sm text-dim">{children}</div>}
    </div>
  );
}

/** Accessible modal built on <dialog>. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-[var(--radius-card)] border border-line-strong bg-card p-0 text-ink backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-reveal",
        // Phones: bottom sheet anchored to the thumb zone, full width, clear of the home indicator.
        "max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line py-2 pl-5 pr-2 sm:py-3">
          <h2 className="min-w-0 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-dim hover:bg-white/5 hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </dialog>
  );
}
