import "./_home/home.css";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  ChevronDown,
  Clock,
  Crown,
  Instagram,
  MapPin,
  Megaphone,
  Navigation,
} from "lucide-react";
import { HaloRays, Leaves, Logo, OrnamentDivider, PetalRain, Rose, VirginEmblem } from "@/components/ornaments";
import { PublicShell, WhatsAppIcon } from "@/components/public/PublicShell";
import { toBookingCatalog } from "@/components/public/booking/catalog";
import type { BookingCatalog } from "@/components/public/booking/types";
import { connectDB } from "@/lib/db";
import { getPublicCatalog } from "@/lib/catalog";
import { formatDuration, formatPrice } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { deriveHours, hoursSummary } from "./_home/hours";
import { Reveal } from "./_home/Reveal";

export const dynamic = "force-dynamic";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function instagramUrl(handle: string) {
  const h = handle.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  return `https://instagram.com/${h.replace(/^@/, "")}`;
}

async function loadCatalog(): Promise<BookingCatalog | null> {
  try {
    await connectDB();
    return toBookingCatalog(await getPublicCatalog());
  } catch (e) {
    // Render with defaults: every link still works and the wizard retries on its own.
    console.error("[home] catalog", e);
    return null;
  }
}

export default async function HomePage() {
  const catalog = await loadCatalog();
  const settings = catalog?.settings ?? DEFAULT_SETTINGS;
  const services = catalog?.services ?? [];
  const branches = catalog?.branches ?? [];
  const hours = deriveHours((catalog?.barbers ?? []).map((b) => b.schedule));
  const summary = hoursSummary(hours);
  const ig = instagramUrl(settings.instagram);
  const locations = branches.filter((b) => b.address || b.mapsUrl);
  const fallbackAddress = !locations.length && settings.address ? settings.address : null;
  const waHref = settings.whatsapp ? whatsappLink(settings.whatsapp, "¡Hola! Quiero hacer una consulta sobre RAM Hair Studio.") : null;

  return (
    <PublicShell wide whatsapp={settings.whatsapp}>
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      {/* ───────────── Hero ───────────── */}
      <section className="relative -mt-6 mx-[calc(50%-50vw)] flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-10">
        {/* Backdrop layers (painted first; nothing here isolates the logo's blend). */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
            <div className="rh-halo-in">
              <HaloRays size={980} rays={64} className="animate-spin-slow opacity-[0.26]" />
            </div>
          </div>
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
            <HaloRays size={600} rays={40} className="animate-spin-slower opacity-[0.12]" />
          </div>
          <div className="vignette absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />

          {/* On phones the roses sit in the corners, small and faint, so they never cover the CTAs. */}
          <div className="absolute -bottom-6 -left-14 origin-bottom-left scale-[0.6] opacity-30 sm:bottom-[12%] sm:left-[6%] sm:scale-100 sm:opacity-60">
            <Rose size={150} tone="dark" className="animate-float" />
            <Leaves size={110} className="-mt-6 ml-8 opacity-80" />
          </div>
          <div className="absolute -right-10 -top-6 origin-top-right scale-[0.7] opacity-30 sm:right-[8%] sm:top-[14%] sm:scale-100 sm:opacity-45">
            <Rose size={84} tone="light" className="animate-float [animation-delay:-4s]" />
          </div>
          <div className="absolute right-[10%] bottom-[22%] hidden opacity-30 md:block">
            <Rose size={56} tone="dark" className="animate-float [animation-delay:-2s]" />
          </div>
          {/* Petals fall behind the content so they never cross the buttons or copy. */}
          <PetalRain />
        </div>

        <div className="relative flex w-full max-w-xl flex-col items-center text-center">
          <p className="animate-fade text-[11px] font-semibold uppercase tracking-[0.3em] text-dim [animation-delay:200ms] min-[380px]:tracking-[0.42em]">
            Barbería · Turnos online
          </p>

          <h1 className="relative mt-2 w-[min(94vw,580px)]">
            <span className="sr-only">{settings.businessName}</span>
            <span className="block aspect-[1.55] w-full overflow-hidden" aria-hidden="true">
              <Logo src={settings.logoUrl} alt="" className="rh-logo-in h-full w-full object-cover object-[50%_48%]" />
            </span>
          </h1>

          {settings.tagline && (
            <p className="animate-reveal -mt-1 font-serif text-xl italic text-dim [animation-delay:700ms] sm:text-2xl">
              {settings.tagline}
            </p>
          )}

          <div className="stagger mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
            {settings.announcement && (
              <div
                style={{ "--i": 8 } as React.CSSProperties}
                className="flex items-start gap-3 rounded-2xl border border-line-strong bg-card/80 px-4 py-3 text-left text-sm backdrop-blur-sm"
                role="note"
              >
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
                <p className="leading-relaxed text-ink">{settings.announcement}</p>
              </div>
            )}

            <Link
              href="/reservar"
              style={{ "--i": 9 } as React.CSSProperties}
              className="rh-cta flex h-16 items-center justify-center gap-3 rounded-2xl bg-ink text-lg font-semibold text-bg shadow-[0_0_0_1px_var(--color-ink),0_18px_50px_-14px_rgba(255,255,255,0.45)] hover:bg-white"
            >
              Reservar turno
              <ArrowRight className="rh-arrow h-5 w-5" aria-hidden="true" />
            </Link>

            <div style={{ "--i": 10 } as React.CSSProperties} className="grid grid-cols-2 gap-3">
              <Link
                href="/mis-turnos"
                className="rh-press flex h-13 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-line-strong bg-bg/40 px-2 text-[13px] font-semibold backdrop-blur-sm hover:border-ink hover:bg-white/5 min-[360px]:gap-2 min-[360px]:text-sm"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Mis turnos
              </Link>
              <Link
                href="/fidelidad"
                className="rh-press flex h-13 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-line-strong bg-bg/40 px-2 text-[13px] font-semibold backdrop-blur-sm hover:border-ink hover:bg-white/5 min-[360px]:gap-2 min-[360px]:text-sm"
              >
                <Crown className="h-4 w-4" aria-hidden="true" /> Fidelidad RAM
              </Link>
            </div>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "--i": 11 } as React.CSSProperties}
                className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-dim transition-colors hover:text-ink"
              >
                <WhatsAppIcon className="h-4 w-4" /> Consultas por WhatsApp
              </a>
            )}
          </div>

          {summary && (
            <p className="animate-fade mt-6 inline-flex items-center gap-2 text-xs text-faint [animation-delay:1200ms]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {summary}
            </p>
          )}
        </div>

        <a
          href={services.length ? "#servicios" : "#horarios"}
          aria-label="Ver servicios y horarios"
          className="rh-scroll-cue absolute bottom-5 left-1/2 -ml-[22px] grid h-11 w-11 place-items-center rounded-full text-dim hover:text-ink"
        >
          <ChevronDown className="h-5 w-5" />
        </a>
      </section>

      {/* ───────────── Servicios ───────────── */}
      {services.length > 0 && (
        <section id="servicios" className="scroll-mt-8 pt-16">
          <SectionTitle eyebrow="La carta" title="Servicios" />
          <ol className="mt-8 flex flex-col">
            {services.map((s, i) => (
              <Reveal as="li" key={s._id} delay={Math.min(i, 6)}>
                <Link
                  href={`/reservar?servicio=${s._id}`}
                  className="rh-row rh-press group flex items-start gap-4 rounded-2xl px-3 py-5 hover:bg-white/[0.03] sm:px-5"
                >
                  <span aria-hidden="true" className="font-gothic w-8 shrink-0 pt-0.5 text-2xl leading-none text-line-strong transition-colors group-hover:text-dim sm:w-9 sm:text-3xl">
                    {ROMAN[i] ?? i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* Wraps instead of squeezing: a long name takes its own line and the dotted leader + price drop below it. */}
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-0 max-w-full text-lg font-semibold leading-snug [overflow-wrap:anywhere] sm:text-xl">{s.name}</span>
                      <span aria-hidden="true" className="mb-1 h-px min-w-3 flex-1 border-b border-dotted border-line-strong" />
                      <span className="font-gothic shrink-0 whitespace-nowrap text-2xl leading-none tabular-nums sm:text-3xl">
                        {formatPrice(s.price, settings.currency)}
                      </span>
                    </span>
                    {s.description && <span className="mt-1.5 block max-w-md text-sm leading-relaxed text-dim">{s.description}</span>}
                    <span className="mt-2 flex items-center gap-3 text-xs font-medium text-faint">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatDuration(s.durationMin)}
                      </span>
                      <span className="rh-row-arrow inline-flex items-center gap-1 text-ink">
                        Reservar <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </Link>
                {i < services.length - 1 && <div className="mx-3 h-px bg-gradient-to-r from-transparent via-line to-transparent" aria-hidden="true" />}
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {/* ───────────── Horarios + Virgen ───────────── */}
      <section id="horarios" className="scroll-mt-8 pt-20">
        <Reveal className="relative overflow-hidden rounded-[28px] border border-line bg-surface">
          <div className="pointer-events-none absolute -right-24 -top-24 opacity-[0.07]" aria-hidden="true">
            <HaloRays size={420} className="animate-spin-slower" />
          </div>
          <div className="relative grid items-center gap-8 p-6 sm:grid-cols-[180px_1fr] sm:p-10">
            <div className="relative mx-auto grid place-items-center">
              <div className="pointer-events-none absolute" aria-hidden="true">
                <HaloRays size={300} rays={44} className="animate-spin-slow opacity-35" />
              </div>
              <VirginEmblem size={150} className="relative" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-dim">Te esperamos</p>
              <h2 className="font-gothic mt-1 text-5xl leading-none">Horarios</h2>
              {hours.some((h) => !h.closed) ? (
                <dl className="mt-6 flex flex-col divide-y divide-line">
                  {hours.map((h) => (
                    <div key={h.days} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                      <dt className="font-semibold">{h.days}</dt>
                      <dd className={cn("tabular-nums", h.closed ? "text-faint" : "text-ink")}>
                        {h.closed ? "Cerrado" : h.ranges.join("  ·  ")}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-dim">
                  Mirá los horarios disponibles al reservar, o escribinos por WhatsApp.
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────── Dónde estamos ───────────── */}
      {(locations.length > 0 || fallbackAddress || ig) && (
        <section className="pt-16">
          <SectionTitle eyebrow="Pasá a vernos" title="Dónde estamos" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {locations.map((b, i) => (
              <Reveal key={b._id} delay={i}>
                <LocationCard name={branches.length > 1 ? b.name : null} address={b.address} mapsUrl={b.mapsUrl} />
              </Reveal>
            ))}
            {fallbackAddress && (
              <Reveal>
                <LocationCard name={null} address={fallbackAddress} mapsUrl="" />
              </Reveal>
            )}
            {ig && (
              <Reveal delay={locations.length + 1}>
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rh-press flex h-full items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5 hover:border-line-strong"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong">
                    <Instagram className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium uppercase tracking-[0.18em] text-dim">Instagram</span>
                    <span className="block truncate font-semibold">
                      @{settings.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "")}
                    </span>
                  </span>
                  <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
                </a>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ───────────── CTA final ───────────── */}
      <section className="pt-20">
        <Reveal className="relative flex flex-col items-center overflow-hidden rounded-[28px] border border-line-strong bg-card px-6 py-12 text-center">
          {/* Corner roses stay tucked into the corners on phones so they never touch the button or copy. */}
          <div className="pointer-events-none absolute -bottom-20 -left-20 opacity-30 sm:-bottom-10 sm:-left-10 sm:opacity-40" aria-hidden="true">
            <Rose size={130} tone="dark" />
          </div>
          <div className="pointer-events-none absolute -right-12 -top-12 opacity-25 sm:-right-8 sm:-top-8 sm:opacity-30" aria-hidden="true">
            <Rose size={100} tone="light" />
          </div>
          <OrnamentDivider />
          <h2 className="font-gothic text-shimmer mt-4 text-5xl leading-none sm:text-6xl">Tu próximo corte</h2>
          <p className="mt-3 max-w-xs font-serif text-lg italic text-dim">Elegí día y hora en menos de un minuto.</p>
          <Link
            href="/reservar"
            className="rh-cta relative mt-7 flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-ink text-base font-semibold text-bg hover:bg-white"
          >
            Reservar turno
            <ArrowRight className="rh-arrow h-5 w-5" aria-hidden="true" />
          </Link>
        </Reveal>
      </section>
    </PublicShell>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="flex flex-col items-center text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-dim">{eyebrow}</p>
      <h2 className="font-gothic mt-1 text-5xl leading-none sm:text-6xl">{title}</h2>
      <OrnamentDivider className="mt-4" />
    </Reveal>
  );
}

function LocationCard({ name, address, mapsUrl }: { name: string | null; address: string; mapsUrl: string }) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {name && <p className="font-semibold">{name}</p>}
          <p className={cn("leading-relaxed", name ? "text-sm text-dim" : "font-medium")}>{address || "Consultanos la dirección"}</p>
        </div>
      </div>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rh-press mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-line-strong text-sm font-semibold hover:border-ink hover:bg-white/5"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" /> Cómo llegar
        </a>
      )}
    </div>
  );
}
