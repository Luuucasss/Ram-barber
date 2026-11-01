"use client";

import { Gift } from "lucide-react";
import { Rose } from "@/components/ornaments";
import { cn } from "@/lib/utils";

type Step = { position: number; percent: number; gift: boolean };

/** Black & white preview of the client's stamp card, mirroring the loyalty rules being edited. */
export function StampCardPreview({
  businessName,
  cardSize,
  steps,
  enabled,
}: {
  businessName: string;
  cardSize: number;
  steps: Step[];
  enabled: boolean;
}) {
  const size = Math.max(2, Math.min(30, cardSize || 2));
  const stamped = Math.min(Math.max(1, Math.floor(size / 2) - 1), size - 1);
  const byPos = new Map(steps.map((s) => [s.position, s]));
  const cols = size <= 5 ? size : size <= 10 ? 5 : 6;
  const [first, ...rest] = businessName.trim().split(/\s+/);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-line-strong bg-bg p-5 shadow-[0_30px_80px_-40px_rgba(255,255,255,0.25)] transition-[opacity,filter] duration-300",
        !enabled && "opacity-50 grayscale",
      )}
      aria-label="Vista previa de la tarjeta de fidelidad"
    >
      {/* The rose owns the top-right corner; all header text stays on the left so nothing sits under it. */}
      <Rose size={140} tone="dark" className="pointer-events-none absolute -right-10 -top-10 opacity-40 max-[359px]:-right-14 max-[359px]:-top-14" />
      <div className="relative max-w-[calc(100%-5.5rem)] leading-none">
        <p className="break-words font-gothic text-4xl max-[359px]:text-3xl">{first || "Ram"}</p>
        {rest.length > 0 && <p className="mt-1 text-[9px] uppercase tracking-[0.4em] text-dim">{rest.join(" ")}</p>}
        <p className="mt-2 font-serif text-sm italic text-dim">Tarjeta de fidelidad</p>
      </div>

      <div className="relative mt-5 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: size }, (_, i) => {
          const pos = i + 1;
          const step = byPos.get(pos);
          const isStamped = pos <= stamped;
          const isLast = pos === size;
          return (
            <div key={pos} className="flex animate-[fade_200ms_ease-out_both] flex-col items-center gap-1">
              <div
                className={cn(
                  "relative flex aspect-square w-full max-w-14 items-center justify-center rounded-full border",
                  isStamped ? "border-ink bg-ink" : step ? "border-ink" : "border-dashed border-line-strong",
                )}
              >
                {isStamped ? (
                  <Rose size={30} tone="dark" className="h-[70%] w-[70%]" />
                ) : isLast ? (
                  <Rose size={30} tone="light" className="h-[62%] w-[62%] opacity-90" />
                ) : step?.gift ? (
                  <Gift className="h-[42%] w-[42%] text-ink" aria-hidden="true" />
                ) : (
                  <span className={cn("text-xs tabular-nums", step ? "font-semibold text-ink" : "text-faint")}>{pos}</span>
                )}
              </div>
              <span className="flex h-3.5 items-center gap-0.5 text-[10px] font-medium leading-none tabular-nums text-dim">
                {step?.percent ? `-${step.percent}%` : step?.gift ? "regalo" : ""}
                {step && step.percent > 0 && step.gift && <Gift className="h-2.5 w-2.5" aria-label="más regalo" />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="relative mt-3 text-center text-[11px] text-faint">
        Ejemplo: cliente con {stamped} {stamped === 1 ? "sello" : "sellos"}. Al completar los {size} se reinicia.
      </p>
    </div>
  );
}
