"use client";

import { forwardRef } from "react";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Rose } from "@/components/ornaments";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** Back control + "Paso n de N" + rose-tipped progress line. */
export function WizardTopBar({
  index,
  total,
  title,
  onBack,
  backHref,
}: {
  index: number;
  total: number;
  title: string;
  onBack?: () => void;
  backHref?: string;
}) {
  const progress = Math.min(1, Math.max(0, (index + 1) / total));
  const backClass =
    "rb-press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink hover:border-ink";
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Volver al paso anterior" className={backClass}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Link href={backHref ?? "/"} aria-label="Volver al inicio" className={backClass}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-dim">
            Paso {index + 1} de {total}
          </p>
          <p key={title} className="rb-swap truncate text-sm font-medium text-ink">
            {title}
          </p>
        </div>
      </div>
      <div
        className="relative mt-4 h-5"
        role="progressbar"
        aria-label="Progreso de la reserva"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <div
          className="rb-progress-fill absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ transform: `scaleX(${progress})` }}
        />
        {/* Marker travels with transform only: the wrapper spans the track and is shifted by its own width. */}
        <div
          className="rb-progress-marker pointer-events-none absolute inset-0"
          style={{ transform: `translateX(${(progress - 1) * 100}%)` }}
          aria-hidden="true"
        >
          <span className="absolute right-0 top-1/2 grid h-5 w-5 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-bg">
            <Rose size={16} tone="light" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Step title with a blackletter roman numeral, tattoo-flash style. */
export const StepHeader = forwardRef<HTMLHeadingElement, { numeral: number; title: string; subtitle?: React.ReactNode }>(
  function StepHeader({ numeral, title, subtitle }, ref) {
    return (
      <header className="mb-6 flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className="font-gothic -mt-0.5 min-w-[1.5ch] shrink-0 select-none text-4xl leading-none text-line-strong sm:-mt-1 sm:min-w-[2ch] sm:text-5xl"
        >
          {ROMAN[numeral] ?? numeral + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h1
            ref={ref}
            tabIndex={-1}
            className="text-[22px] font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] outline-none sm:text-2xl"
          >
            {title}
          </h1>
          {subtitle && <div className="mt-1.5 text-sm leading-relaxed text-dim">{subtitle}</div>}
        </div>
      </header>
    );
  },
);

/** Big pressable choice card. `selected` shows the inverted check badge. */
export function OptionCard({
  selected,
  onClick,
  disabled,
  children,
  className,
  style,
  ariaLabel,
}: {
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      style={style}
      className={cn(
        "rb-press group relative w-full rounded-[var(--radius-card)] border p-4 text-left disabled:opacity-40",
        selected
          ? "rb-picked border-ink bg-card-2 shadow-[0_0_0_1px_var(--color-ink),0_18px_40px_-20px_rgba(255,255,255,0.35)]"
          : "border-line bg-card hover:border-line-strong hover:bg-card-2",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border transition-[opacity,scale] duration-200 ease-out",
          selected ? "scale-100 border-ink bg-ink text-bg opacity-100" : "scale-90 border-line-strong opacity-0",
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export function Avatar({ name, photoUrl, size = 56 }: { name: string; photoUrl?: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-surface"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover grayscale" loading="lazy" />
      ) : (
        <span className="font-gothic leading-none text-ink" style={{ fontSize: size * 0.55 }}>
          {initial}
        </span>
      )}
    </span>
  );
}

/** Price with optional struck-through original. */
export function PriceTag({
  price,
  final,
  currency,
  className,
}: {
  price: number;
  final: number;
  currency: string;
  className?: string;
}) {
  const discounted = final < price;
  return (
    <span className={cn("inline-flex flex-col items-end leading-tight tabular-nums", className)}>
      {discounted && <s className="text-xs text-faint">{formatPrice(price, currency)}</s>}
      <span className="font-semibold text-ink">{final === 0 && discounted ? "Sin cargo" : formatPrice(final, currency)}</span>
    </span>
  );
}

export function Notice({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: "neutral" | "warn" | "bad" | "ok";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Black & white only: tones differ by weight of the border/surface, never by hue.
  const tones = {
    neutral: "border-line-strong bg-card text-ink",
    warn: "border-line-strong bg-card-2 text-ink",
    bad: "border-ink/60 bg-card-2 text-ink",
    ok: "border-line-strong bg-card text-ink",
  } as const;
  return (
    <div role="status" className={cn("rb-notice flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
