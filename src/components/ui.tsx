"use client";

import { forwardRef, useEffect, useId, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-bg hover:bg-white shadow-[0_0_0_1px_var(--color-ink),0_10px_30px_-10px_rgba(255,255,255,0.35)] hover:shadow-[0_0_0_1px_#fff,0_14px_40px_-10px_rgba(255,255,255,0.5)]",
  outline: "border border-line-strong text-ink hover:border-ink hover:bg-white/5",
  ghost: "text-dim hover:text-ink hover:bg-white/5",
  danger: "border border-bad/50 text-bad hover:bg-bad/10 hover:border-bad",
  subtle: "bg-card-2 text-ink hover:bg-line border border-line",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-2xl gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2",
  icon: "h-10 w-10 rounded-xl",
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

const fieldBase =
  "w-full rounded-2xl border border-line bg-surface px-4 text-ink placeholder:text-faint transition-colors focus:border-ink focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-bad";

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
  return (
    <select ref={ref} className={cn(fieldBase, "h-12 appearance-none pr-10", className)} {...props}>
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
        <p className="text-xs text-bad" role="alert">
          {error}
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
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
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
      {label && <span className="text-sm text-ink">{label}</span>}
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
  ok: "border-ok/40 text-ok bg-ok/5",
  bad: "border-bad/40 text-bad bg-bad/5",
  warn: "border-warn/40 text-warn bg-warn/5",
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
    <p role="alert" className={cn("rounded-xl border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad", className)}>
      {children}
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
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-dim hover:text-ink" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}
