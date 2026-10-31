import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out active:scale-[0.97]";

const variants = {
  primary:
    "bg-ink text-bg hover:bg-white shadow-[0_0_0_1px_var(--color-ink),0_10px_30px_-10px_rgba(255,255,255,0.35)]",
  outline: "border border-line-strong text-ink hover:border-ink hover:bg-white/5",
  ghost: "text-dim hover:text-ink hover:bg-white/5",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-14 px-6 text-base rounded-2xl",
} as const;

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  block?: boolean;
  className?: string;
  /** Opens in a new tab (external links: maps, WhatsApp, calendar). */
  external?: boolean;
};

/** A link styled like `<Button>` (the shared Button has no `asChild`). */
export function CtaLink({ href, children, variant = "primary", size = "md", block, className, external }: Props) {
  const cls = cn(base, variants[variant], sizes[size], block && "w-full", className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
