"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check, ExternalLink, Link2, Share2 } from "lucide-react";
import { HaloRays, Rose } from "@/components/ornaments";
import { WhatsAppIcon } from "@/components/public/PublicShell";
import { googleCalendarLink, formatDateLong } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { SummaryCard, type Summary } from "./ConfirmStep";
import type { CreatedBooking } from "./types";

const SPARKS = Array.from({ length: 12 }, (_, i) => i * 30);

const actionClass =
  "rb-press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-center text-base font-semibold leading-snug sm:px-5";

export function SuccessStep({
  booking,
  summary,
  businessName,
  address,
  timezone,
  whatsapp,
}: {
  booking: CreatedBooking;
  summary: Summary;
  businessName: string;
  address: string;
  timezone: string;
  whatsapp: string;
}) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [link, setLink] = useState(`/turno/${booking.token}`);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setLink(`${window.location.origin}/turno/${booking.token}`);
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [booking.token]);

  const calendarHref = googleCalendarLink({
    title: `${booking.serviceName} · ${businessName}`,
    date: booking.date,
    start: booking.start,
    end: booking.end,
    details: `Turno con ${booking.barberName || "RAM"}.\nGestioná tu turno: ${link}`,
    location: address || booking.branchName,
    timezone,
  });

  async function saveLink() {
    const shareData = {
      title: `Mi turno en ${businessName}`,
      text: `${booking.serviceName} — ${formatDateLong(booking.date)} a las ${booking.start} hs`,
      url: link,
    };
    if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2400);
  }

  const firstName = booking.clientName;
  const waText = `¡Hola! Reservé un turno: ${booking.serviceName}, ${formatDateLong(booking.date)} a las ${booking.start} hs.${firstName ? ` Soy ${firstName}.` : ""}`;

  return (
    <div className="flex flex-col items-center text-center">
      {/* Halo burst + rose pop */}
      <div className="relative grid h-56 w-56 place-items-center" aria-hidden="true">
        <div className="rb-burst-halo absolute inset-[-70px] grid place-items-center">
          <HaloRays size={360} rays={48} />
        </div>
        <span className="rb-burst-ring absolute inset-6 rounded-full border border-ink/70" />
        <span data-late="" className="rb-burst-ring absolute inset-6 rounded-full border border-ink/40" />
        {SPARKS.map((a, i) => (
          <span
            key={a}
            className="rb-spark absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rotate-45 bg-ink"
            style={{ "--a": `${a}deg`, "--i": i % 4 } as React.CSSProperties}
          />
        ))}
        <div className="rb-rose-pop relative grid h-32 w-32 place-items-center rounded-full border border-line-strong bg-bg shadow-[0_0_60px_-10px_rgba(255,255,255,0.35)]">
          <Rose size={92} tone="light" />
          <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-4 border-bg bg-ink text-bg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="rb-check" />
            </svg>
          </span>
        </div>
      </div>

      <div className="rb-stagger mt-4 flex w-full flex-col items-center">
        <h1
          ref={titleRef}
          tabIndex={-1}
          style={{ "--i": 4 } as React.CSSProperties}
          className="font-gothic text-shimmer text-[2.75rem] leading-[0.95] outline-none min-[380px]:text-5xl sm:text-6xl"
        >
          ¡Turno confirmado!
        </h1>
        <p style={{ "--i": 5 } as React.CSSProperties} className="mt-3 font-serif text-xl italic text-dim [overflow-wrap:anywhere]">
          {firstName ? `Te esperamos, ${firstName}.` : "Te esperamos."}
        </p>

        <div style={{ "--i": 6 } as React.CSSProperties} className="mt-7 w-full text-left">
          <SummaryCard summary={{ ...summary, barber: booking.barberName || summary.barber }} />
        </div>

        <div style={{ "--i": 7 } as React.CSSProperties} className="mt-6 flex w-full flex-col gap-3">
          <a
            href={calendarHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              actionClass,
              "bg-ink text-bg shadow-[0_0_0_1px_var(--color-ink),0_10px_30px_-10px_rgba(255,255,255,0.35)] hover:bg-white",
            )}
          >
            <CalendarPlus className="h-5 w-5" aria-hidden="true" /> Agregar a Google Calendar
          </a>
          <button
            type="button"
            onClick={saveLink}
            className={cn(actionClass, "border border-line-strong text-ink hover:border-ink hover:bg-white/5")}
          >
            <span key={copied} className="rb-swap inline-flex items-center gap-2" aria-live="polite">
              {copied === "copied" ? (
                <>
                  <Check className="h-5 w-5" aria-hidden="true" /> ¡Link copiado!
                </>
              ) : copied === "failed" ? (
                <>
                  <Link2 className="h-5 w-5" aria-hidden="true" /> Copiá el link de abajo
                </>
              ) : (
                <>
                  <Share2 className="h-5 w-5" aria-hidden="true" /> Guardar link de mi turno
                </>
              )}
            </span>
          </button>
          {copied === "failed" && (
            <p className="rb-swap select-all break-all rounded-xl border border-line bg-surface px-3 py-2 text-xs text-dim">
              {link}
            </p>
          )}
          <Link
            href={`/turno/${booking.token}`}
            className={cn(actionClass, "border border-line-strong text-ink hover:border-ink hover:bg-white/5")}
          >
            <ExternalLink className="h-5 w-5" aria-hidden="true" /> Ver / gestionar mi turno
          </Link>
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(actionClass, "min-h-12 text-sm text-dim hover:bg-white/5 hover:text-ink")}
            >
              <WhatsAppIcon className="h-4 w-4" /> Avisar por WhatsApp
            </a>
          )}
        </div>

        <Link
          href="/"
          style={{ "--i": 8 } as React.CSSProperties}
          className="mt-3 inline-flex min-h-11 items-center px-4 text-sm text-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
