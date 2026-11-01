import { Gift } from "lucide-react";
import { HaloRays, Rose } from "@/components/ornaments";
import { Pill } from "@/components/ui";
import type { AppSettings } from "@/lib/validation";
import { cn } from "@/lib/utils";

type Step = AppSettings["loyalty"]["steps"][number];

/*
 * Motion notes (rare screen, delight budget):
 * - Filled stamps "bloom": the ink ring slams down (scale 1.22 → 1), then the rose unfurls
 *   (rotate -80° → 0, scale .55 → 1, blur → sharp). Strong ease-out, staggered 90 ms.
 * - The next slot gets a hand-drawn ring (stroke draw) after the stamps land.
 * - One laminate sheen sweeps across the card once. Transform/opacity only.
 * Reduced motion: globals.css collapses durations, `both` fill lands on the final frame.
 */
const CSS = `
@keyframes ram-bloom {
  0% { opacity: 0; transform: scale(.55) rotate(-80deg); filter: blur(3px); }
  60% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0); }
}
@keyframes ram-stamp {
  0% { opacity: 0; transform: scale(1.22); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ram-sheen {
  0% { transform: translateX(-130%) skewX(-12deg); }
  100% { transform: translateX(130%) skewX(-12deg); }
}
`;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function stepLabel(step: Pick<Step, "percent" | "gift"> | null | undefined): string {
  if (!step) return "";
  if (step.gift && step.percent) return `${step.percent}% OFF + regalo`;
  if (step.gift) return "Regalo";
  return step.percent ? `${step.percent}% OFF` : "";
}

function columns(size: number) {
  if (size <= 4) return size;
  if (size <= 8) return 4;
  if (size <= 10) return 5;
  return 6;
}

function CornerStar({ className }: { className?: string }) {
  return (
    <svg viewBox="-6 -6 12 12" className={cn("absolute h-3 w-3 text-line-strong", className)} aria-hidden="true">
      <path d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z" fill="currentColor" />
    </svg>
  );
}

export function StampCard({
  cardSize,
  steps,
  stamps,
  cycle,
  footer,
  highlightNext = true,
  badge,
  paused,
  className,
}: {
  cardSize: number;
  steps: Step[];
  stamps: number;
  cycle: number;
  footer?: React.ReactNode;
  highlightNext?: boolean;
  /** Small pill in the header (e.g. "Ejemplo", "En pausa"). */
  badge?: string;
  paused?: boolean;
  className?: string;
}) {
  const cols = columns(cardSize);
  const nextPos = stamps + 1;
  const stepAt = new Map(steps.map((s) => [s.position, s]));
  const landAt = 250 + Math.max(0, stamps) * 90 + 300; // when the last stamp has settled

  return (
    <article
      aria-label={`Tarjeta de fidelidad: ${stamps} de ${cardSize} sellos`}
      className={cn(
        "relative isolate overflow-hidden rounded-[24px] border border-line-strong p-2",
        "bg-[radial-gradient(130%_90%_at_50%_0%,#1f1f1f_0%,#111_55%,#0a0a0a_100%)]",
        "shadow-[0_30px_80px_-40px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <style>{CSS}</style>

      {/* One-time laminate sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/4 z-20 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)]"
        style={{ animation: `ram-sheen 1.6s cubic-bezier(0.77, 0, 0.175, 1) ${landAt + 200}ms both` }}
      />

      {/* Inner flash-sheet border */}
      <div className={cn("relative rounded-[18px] border border-line px-3 pb-4 pt-5 min-[360px]:px-4 sm:px-5", paused && "grayscale")}>
        <CornerStar className="left-2 top-2" />
        <CornerStar className="right-2 top-2" />
        <CornerStar className="bottom-2 left-2" />
        <CornerStar className="bottom-2 right-2" />

        <header className="mb-5 flex items-end justify-between gap-3 px-1">
          <div className="leading-none">
            <span className="block font-gothic text-4xl text-shimmer">Ram</span>
            <span className="mt-1 block pl-0.5 text-[10px] font-medium uppercase tracking-[0.4em] text-dim min-[360px]:text-[11px]">
              Hair Studio
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-right">
            {badge && (
              <Pill tone="neutral" className="py-0 text-[10px] uppercase tracking-widest">
                {badge}
              </Pill>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-faint min-[360px]:text-[11px]">Tarjeta</span>
            <span className="font-serif text-xl italic leading-none text-ink">N° {String(cycle).padStart(2, "0")}</span>
          </div>
        </header>

        <ol
          className={cn("grid gap-x-2 gap-y-3", paused && "opacity-55")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cardSize }, (_, i) => {
            const position = i + 1;
            const filled = position <= stamps;
            const isNext = highlightNext && !paused && position === nextPos;
            const step = stepAt.get(position);
            const label = stepLabel(step);
            const gift = Boolean(step?.gift);
            const delay = 250 + i * 90;
            return (
              <li key={position} className="flex flex-col items-center gap-1.5">
                <div className="relative aspect-square w-full max-w-[68px]">
                  {gift && !filled && (
                    <div className="pointer-events-none absolute -inset-[40%] grid place-items-center sm:-inset-[55%]" aria-hidden="true">
                      <HaloRays
                        size={160}
                        rays={28}
                        className={cn("h-full w-full", isNext ? "opacity-70" : "opacity-40", "animate-spin-slow")}
                      />
                    </div>
                  )}

                  {/* Slot / stamp ring */}
                  <div
                    className={cn(
                      "relative grid h-full w-full place-items-center rounded-full",
                      filled
                        ? "border-2 border-ink bg-bg shadow-[0_0_0_3px_#0a0a0a,0_0_0_4px_rgba(244,244,242,0.25)]"
                        : gift
                          ? "border border-ink/70 bg-bg"
                          : "border border-dashed border-line-strong bg-black/40",
                    )}
                    style={filled ? { animation: `ram-stamp 380ms ${EASE_OUT} ${delay}ms both` } : undefined}
                  >
                    {filled ? (
                      <Rose
                        size={56}
                        tone="light"
                        className="h-[80%] w-[80%]"
                        style={{ animation: `ram-bloom 760ms ${EASE_OUT} ${delay + 80}ms both` }}
                      />
                    ) : gift ? (
                      <Gift className={cn("h-[42%] w-[42%]", isNext ? "text-ink" : "text-dim")} strokeWidth={1.5} />
                    ) : (
                      <span
                        className={cn(
                          "font-serif text-lg font-semibold tabular-nums sm:text-xl",
                          isNext ? "text-ink" : label ? "text-dim" : "text-faint",
                        )}
                      >
                        {position}
                      </span>
                    )}
                  </div>

                  {/* Hand-drawn ring around the next stamp */}
                  {isNext && (
                    <svg
                      viewBox="0 0 100 100"
                      className="pointer-events-none absolute -inset-[9%] h-[118%] w-[118%] -rotate-90"
                      aria-hidden="true"
                    >
                      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-ink)" strokeOpacity="0.18" strokeWidth="1" className="animate-glow" />
                      <circle
                        cx="50"
                        cy="50"
                        r="47"
                        fill="none"
                        stroke="var(--color-ink)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        pathLength={1}
                        className="animate-draw"
                        style={
                          {
                            strokeDasharray: 1,
                            "--len": 1,
                            animationDuration: "1.1s",
                            animationDelay: `${landAt}ms`,
                          } as React.CSSProperties
                        }
                      />
                    </svg>
                  )}
                </div>

                <span
                  className={cn(
                    "flex min-h-[26px] max-w-full items-start justify-center text-balance text-center text-[10px] font-semibold uppercase leading-[1.15] tracking-[0.03em] [overflow-wrap:anywhere] min-[360px]:text-[11px]",
                    isNext ? "text-ink" : filled ? "text-faint" : label ? "text-dim" : "text-transparent",
                  )}
                >
                  {label || (isNext ? "Próximo" : "·")}
                </span>
              </li>
            );
          })}
        </ol>

        {footer && (
          <footer className="mt-4 border-t border-dashed border-line pt-3 text-center text-xs text-dim">{footer}</footer>
        )}
      </div>
    </article>
  );
}
