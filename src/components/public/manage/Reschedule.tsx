"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { Button, ErrorText, Spinner } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";
import { dateChip, relativeDay } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { BookingPayload } from "@/app/api/public/booking/[token]/_shared";
import type { RescheduleAvailability } from "@/app/api/public/booking/[token]/availability/route";
import { WhatsAppIcon } from "@/components/public/PublicShell";

const SLOT_TAKEN_MSG = "Justo se ocupó ese horario. Elegí otro — tu turno actual sigue en pie.";

function groupSlots(slots: string[]) {
  const groups: { label: string; slots: string[] }[] = [
    { label: "Mañana", slots: slots.filter((s) => s < "13:00") },
    { label: "Tarde", slots: slots.filter((s) => s >= "13:00" && s < "19:00") },
    { label: "Noche", slots: slots.filter((s) => s >= "19:00") },
  ];
  return groups.filter((g) => g.slots.length);
}

export function Reschedule({
  token,
  data,
  onDone,
  onClose,
}: {
  token: string;
  data: BookingPayload;
  onDone: (next: BookingPayload) => void;
  onClose: () => void;
}) {
  const { booking } = data;
  const [avail, setAvail] = useState<RescheduleAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // On phones the panel opens below the ticket: bring it to the top of the screen so the day chips
  // and several rows of slots show above the sticky confirm bar.
  // Phase "mount": only if the panel is (almost) off-screen, so the spinner can be seen. The page is
  // still short here, so it can't reach the top yet. Phase "ready": once the slots are laid out
  // (effects run after commit) scroll for real. An explicit window.scrollTo target is computed from
  // the current scroll position, so a new call cleanly retargets a smooth scroll still in flight.
  // The phase is recorded only when it actually runs, so StrictMode's double effect can't eat it.
  const scrolled = useRef<"none" | "mount" | "ready">("none");
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || scrolled.current === "ready") return;
    const phase = loading ? "mount" : "ready";
    if (phase === "mount" && scrolled.current === "mount") return;
    scrolled.current = phase;
    const top = el.getBoundingClientRect().top;
    const vh = window.innerHeight;
    const needed = phase === "mount" ? top > vh - 140 : top < 0 || top > vh * 0.12;
    if (!needed) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, window.scrollY + top - 12), behavior: reduce ? "auto" : "smooth" });
  }, [loading]);

  const isCurrent = useCallback(
    (d: string, s: string) => d === booking.date && s === booking.start,
    [booking.date, booking.start],
  );

  const load = useCallback(
    async (keepDate?: string | null) => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await api<RescheduleAvailability>(`/api/public/booking/${token}/availability`);
        setAvail(res);
        const usable = (d: { date: string; slots: string[] }) => d.slots.some((s) => !isCurrent(d.date, s));
        const keep = keepDate ? res.days.find((d) => d.date === keepDate && usable(d)) : undefined;
        setDate((keep ?? res.days.find(usable))?.date ?? null);
      } catch (e) {
        setLoadError(e instanceof ApiClientError ? e.message : "No pudimos cargar los horarios.");
      } finally {
        setLoading(false);
      }
    },
    [token, isCurrent],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const day = useMemo(() => avail?.days.find((d) => d.date === date) ?? null, [avail, date]);
  const groups = useMemo(() => groupSlots(day?.slots ?? []), [day]);
  const today = avail?.today ?? data.today;

  // Bring the confirm bar into view once a slot is picked (mobile: grid can be long).
  useEffect(() => {
    if (slot) confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [slot]);

  async function confirm() {
    if (!date || !slot) return;
    if (isCurrent(date, slot)) {
      setError("Ese es tu horario actual. Elegí uno distinto.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await api<BookingPayload>(`/api/public/booking/${token}/reschedule`, {
        body: { date, start: slot },
      });
      onDone(next);
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "slot_taken") {
        setError(SLOT_TAKEN_MSG);
        setSlot(null);
        void load(date);
      } else {
        setError(e instanceof ApiClientError ? e.message : "No pudimos cambiar el turno. Probá de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  const noSlotsAtAll = avail && !avail.days.some((d) => d.slots.some((s) => !isCurrent(d.date, s)));

  return (
    <section
      ref={sectionRef}
      aria-labelledby="reschedule-title"
      // overflow-clip (not hidden: that would break the sticky bar) rounds the bar's corners only
      // where the card really ends; while pinned to the viewport the bar stays square.
      className="scroll-mt-4 animate-reveal overflow-clip rounded-[var(--radius-card)] border border-line-strong bg-card p-4 [animation-duration:400ms] sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="reschedule-title" className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" /> Elegí un nuevo horario
          </h2>
          <p className="mt-1 text-sm text-dim">
            Mismo servicio y barbero{booking.barberName ? ` (${booking.barberName})` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-2 inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-dim transition-colors hover:text-ink active:bg-white/5"
        >
          Volver
        </button>
      </div>

      {loading && !avail ? (
        <Spinner label="Buscando horarios libres…" />
      ) : loadError ? (
        <div className="flex flex-col gap-3">
          <ErrorText>{loadError}</ErrorText>
          <Button variant="outline" onClick={() => load(date)}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      ) : noSlotsAtAll ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
          <p className="font-medium">No hay otros horarios libres con {booking.barberName || "tu barbero"}.</p>
          <p className="text-sm text-dim">Escribinos y te ayudamos a encontrar uno.</p>
          <a
            href={whatsappLink(
              data.whatsapp,
              `¡Hola! Quiero cambiar mi turno del ${relativeDay(booking.date, today).toLowerCase()} a las ${booking.start} (${booking.serviceName}).`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:border-ink active:scale-[0.97]"
          >
            <WhatsAppIcon className="h-4 w-4" /> Escribir por WhatsApp
          </a>
        </div>
      ) : (
        <>
          {/* Day chips */}
          <div
            role="listbox"
            aria-label="Día"
            className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5"
          >
            {avail?.days.map((d) => {
              const chip = dateChip(d.date);
              const count = d.slots.filter((s) => !isCurrent(d.date, s)).length;
              const selected = d.date === date;
              const disabled = count === 0;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => {
                    setDate(d.date);
                    setSlot(null);
                    setError("");
                  }}
                  className={cn(
                    "flex w-[60px] shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-2.5",
                    "transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96]",
                    selected
                      ? "border-ink bg-ink text-bg"
                      : disabled
                        ? "border-line text-faint opacity-40"
                        : "border-line-strong text-ink hover:border-ink",
                  )}
                >
                  <span className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", selected ? "text-bg/70" : "text-dim")}>
                    {d.date === today ? "Hoy" : chip.day}
                  </span>
                  <span className="font-serif text-2xl font-semibold leading-none">{chip.num}</span>
                  <span className={cn("text-[10px] uppercase tracking-widest", selected ? "text-bg/60" : "text-faint")}>
                    {chip.month}
                  </span>
                  {d.date === booking.date && (
                    <span
                      className={cn("mt-0.5 h-1 w-1 rounded-full", selected ? "bg-bg" : "bg-ink")}
                      title="Día de tu turno actual"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Slot grid: keyed by date so each day fades in fresh */}
          <div key={date ?? "none"} className="mt-4 flex animate-fade flex-col gap-4 [animation-duration:220ms]">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-faint">{g.label}</p>
                <div className="grid grid-cols-4 gap-2" role="listbox" aria-label={`Horarios de la ${g.label.toLowerCase()}`}>
                  {g.slots.map((s) => {
                    const current = date ? isCurrent(date, s) : false;
                    const selected = s === slot;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={current}
                        onClick={() => {
                          setSlot(s);
                          setError("");
                        }}
                        className={cn(
                          "relative flex h-11 flex-col items-center justify-center rounded-xl border text-sm font-semibold tabular-nums",
                          "transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.95]",
                          selected
                            ? "border-ink bg-ink text-bg"
                            : current
                              ? "border-dashed border-line-strong text-faint"
                              : "border-line bg-surface text-ink hover:border-ink",
                        )}
                      >
                        {s}
                        {current && <span className="text-[9px] font-medium uppercase tracking-wider">Actual</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {day && groups.length === 0 && (
              <p className="py-6 text-center text-sm text-dim">No quedan horarios libres este día.</p>
            )}
          </div>

          {/* Phones: the confirm bar sticks to the bottom of the screen while the slot grid scrolls. */}
          <div
            ref={confirmRef}
            className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-5 flex flex-col gap-3 border-t border-line bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:static sm:mx-0 sm:mb-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none"
          >
            {error && <ErrorText>{error}</ErrorText>}
            <p className="text-sm text-dim" aria-live="polite">
              {slot && date ? (
                <>
                  Nuevo horario:{" "}
                  <span className="font-semibold text-ink">
                    {relativeDay(date, today)} · {slot} hs
                  </span>
                </>
              ) : (
                <>
                  Tu turno actual: {relativeDay(booking.date, today)} · {booking.start} hs
                </>
              )}
            </p>
            <Button size="lg" block disabled={!slot} loading={saving} onClick={confirm}>
              Confirmar cambio
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
