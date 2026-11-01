import { HaloRays } from "@/components/ornaments";
import { Pill } from "@/components/ui";
import type { LoyaltyView } from "@/lib/loyalty";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Active membership: plan name, cuts left (as a row of tally marks) and validity. */
export function MemberCard({ member }: { member: NonNullable<LoyaltyView["member"]> }) {
  const total = Math.max(member.cutsPerPeriod, member.cutsRemaining);
  const shown = Math.min(total, 30);
  const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(member.validUntil) ? formatDateLong(member.validUntil) : "";

  return (
    <article className="relative isolate overflow-hidden rounded-[24px] border border-ink/80 bg-card-2 px-4 pb-6 pt-7 text-center shadow-[0_30px_80px_-40px_rgba(255,255,255,0.35)] animate-reveal min-[360px]:px-5">
      <div className="pointer-events-none absolute inset-x-0 -top-44 -z-10 flex justify-center opacity-25" aria-hidden="true">
        <HaloRays size={460} rays={52} className="animate-spin-slow" />
      </div>

      <Pill tone="ink" className="uppercase tracking-[0.2em]">
        Socio RAM
      </Pill>
      <h2 className="mt-3 text-balance break-words font-gothic text-[clamp(2.25rem,11vw,3rem)] leading-none text-shimmer">
        {member.planName || "Plan exclusivo"}
      </h2>

      <div className="mt-6 flex items-end justify-center gap-2">
        <span className="font-serif text-7xl font-semibold leading-[0.8] tabular-nums">{member.cutsRemaining}</span>
        <span className="pb-1 text-left text-sm leading-tight text-dim">
          de {member.cutsPerPeriod}
          <br />
          cortes disponibles
        </span>
      </div>

      <ol className="stagger mt-5 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <li
            key={i}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "h-6 w-1.5 rounded-full",
              i < member.cutsRemaining ? "bg-ink" : "border border-line-strong bg-transparent",
            )}
          />
        ))}
      </ol>

      {validUntil && (
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-dim">
          Vigente hasta el <span className="text-ink">{validUntil}</span>
        </p>
      )}
    </article>
  );
}
