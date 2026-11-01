"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { AdminFab, AdminPageHeader } from "@/components/admin/AdminShell";
import { BookingDrawer } from "@/components/admin/bookings/BookingDrawer";
import { NewBookingSheet, type NewBookingPreset } from "@/components/admin/bookings/NewBookingSheet";
import { useAutoRefresh, useShortcuts } from "@/components/admin/bookings/hooks";
import type { AdminBooking, AgendaData } from "@/components/admin/bookings/types";
import { useCatalog } from "@/components/admin/bookings/useCatalog";
import { Button, EmptyState, ErrorText, Input, Select } from "@/components/ui";
import { Rose } from "@/components/ornaments";
import { api } from "@/lib/client-api";
import { formatDateLong } from "@/lib/format";
import { addDays, nowInTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AgendaList, type ListMode } from "./AgendaList";
import { KpiStrip } from "./KpiStrip";
import { TimeGrid } from "./TimeGrid";
import { computeKpis } from "./layout";

const PREFS_KEY = "ram.agenda.prefs";

function readPrefs(): { showCancelled: boolean; mode: ListMode; branch: string } {
  const fallback = { showCancelled: false, mode: "barber" as ListMode, branch: "" };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return fallback;
  }
}

export function AgendaView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("d") ?? "";

  const { catalog } = useCatalog();
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelled, setShowCancelled] = useState(false);
  const [mode, setMode] = useState<ListMode>("barber");
  const [branch, setBranch] = useState("");
  const [prefsReady, setPrefsReady] = useState(false);

  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [preset, setPreset] = useState<NewBookingPreset | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const p = readPrefs();
    setShowCancelled(p.showCancelled);
    setMode(p.mode);
    setBranch(p.branch);
    setPrefsReady(true);
  }, []);
  useEffect(() => {
    if (!prefsReady) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ showCancelled, mode, branch }));
    } catch {
      /* storage unavailable: preferences just won't persist */
    }
  }, [showCancelled, mode, branch, prefsReady]);

  const ctrl = useRef<AbortController | null>(null);
  const load = useCallback(
    async (silent = false) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      if (!silent) setLoading(true);
      try {
        const qs = requested ? `?date=${requested}` : "";
        const d = await api<AgendaData>(`/api/admin/agenda${qs}`, { signal: c.signal });
        setData(d);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (ctrl.current === c) setLoading(false);
      }
    },
    [requested],
  );

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);
  useAutoRefresh(() => load(true), 60_000);

  const date = data?.date ?? requested;
  const today = data?.today ?? "";
  const isToday = Boolean(data && data.date === data.today);
  const tz = data?.settings.timezone ?? "America/Argentina/Cordoba";
  const currency = data?.settings.currency ?? "ARS";

  // Current-time indicator.
  useEffect(() => {
    if (!isToday) {
      setNowMin(null);
      return;
    }
    const tick = () => setNowMin(nowInTz(tz).minutes);
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isToday, tz]);

  const goTo = useCallback(
    (d: string) => {
      const next = !d || d === today ? pathname : `${pathname}?d=${d}`;
      router.replace(next, { scroll: false });
    },
    [pathname, router, today],
  );
  const shift = (n: number) => date && goTo(addDays(date, n));

  const branches = catalog?.branches ?? [];
  const barbers = useMemo(
    () => (data?.barbers ?? []).filter((b) => !branch || b.branchId === branch),
    [data, branch],
  );
  const barberIds = useMemo(() => new Set(barbers.map((b) => b._id)), [barbers]);
  const dayBookings = useMemo(
    () => (data?.bookings ?? []).filter((b) => !branch || barberIds.has(b.barberId)),
    [data, barberIds, branch],
  );
  const visibleBookings = useMemo(
    () => dayBookings.filter((b) => showCancelled || b.status !== "cancelled"),
    [dayBookings, showCancelled],
  );
  const cancelledCount = dayBookings.length - dayBookings.filter((b) => b.status !== "cancelled").length;
  const kpis = useMemo(
    () => computeKpis(date, barbers, dayBookings, data?.timeOffs ?? []),
    [date, barbers, dayBookings, data],
  );

  const openBooking = useCallback((b: AdminBooking) => {
    setSelected(b);
    setDrawerOpen(true);
  }, []);

  const openNew = useCallback((p: NewBookingPreset | null = null) => {
    setPreset(p);
    setNewOpen(true);
  }, []);

  // Optimistic + server updates coming from the drawer.
  const applyChange = useCallback((b: AdminBooking) => {
    setSelected(b);
    setData((d) => {
      if (!d) return d;
      const others = d.bookings.filter((x) => x._id !== b._id);
      const bookings = b.date === d.date ? [...others, b].sort((x, y) => x.start.localeCompare(y.start)) : others;
      return { ...d, bookings };
    });
  }, []);

  useShortcuts({
    ArrowLeft: () => shift(-1),
    ArrowRight: () => shift(1),
    t: () => goTo(""),
    T: () => goTo(""),
    n: () => openNew({ date }),
    N: () => openNew({ date }),
  });

  const businessName = catalog?.settings.businessName;
  const headerDate = date ? (isToday ? `Hoy · ${formatDateLong(date)}` : formatDateLong(date)) : "Cargando…";

  return (
    // Phones: extra bottom room so the floating "Nuevo turno" never hides the last booking.
    <div className="flex flex-col gap-5 pb-20 md:pb-0">
      <AdminPageHeader
        title="Agenda"
        description={headerDate}
        actions={
          // Phones too: the floating button only takes over once this one scrolls away.
          <Button id="agenda-new-inline" onClick={() => openNew({ date })} size="sm" className="h-11 md:h-9" title="Nuevo turno (N)">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo turno
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="-mt-2 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center rounded-xl border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-dim transition-colors hover:bg-white/5 hover:text-ink active:bg-white/10 md:h-9 md:w-9"
              aria-label="Día anterior (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo("")}
              disabled={isToday}
              className="h-11 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/5 active:bg-white/10 disabled:text-faint disabled:hover:bg-transparent md:h-9"
              title="Ir a hoy (T)"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-dim transition-colors hover:bg-white/5 hover:text-ink active:bg-white/10 md:h-9 md:w-9"
              aria-label="Día siguiente (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <label className="relative min-w-0 flex-1 md:flex-none">
            <span className="sr-only">Elegir fecha</span>
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
              aria-hidden="true"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => e.target.value && goTo(e.target.value)}
              className="h-12 w-full min-w-0 rounded-xl pl-9 pr-3 text-base md:h-10 md:w-auto md:text-sm"
            />
          </label>
        </div>

        {/* Phone: swipeable day strip around the selected date */}
        {date && today && <DayStrip date={date} today={today} onPick={goTo} />}

        <div className="flex items-center gap-2 md:contents">
          {branches.length > 1 && (
            <Select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl pr-8 text-base md:h-10 md:w-auto md:flex-none md:text-sm"
              aria-label="Sucursal"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              role="switch"
              aria-checked={showCancelled}
              onClick={() => setShowCancelled(!showCancelled)}
              className="inline-flex h-11 items-center gap-2.5 rounded-xl px-2 text-sm text-dim transition-colors hover:text-ink md:h-10"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
                  showCancelled ? "border-ink bg-ink" : "border-line-strong bg-card-2",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4.5 w-4.5 rounded-full transition-[left,background-color] duration-200 ease-out",
                    showCancelled ? "left-[22px] bg-bg" : "left-0.5 bg-dim",
                  )}
                />
              </span>
              <span>
                Cancelados{cancelledCount ? <span className="tabular-nums"> ({cancelledCount})</span> : null}
              </span>
            </button>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-dim transition-colors hover:bg-white/5 hover:text-ink active:bg-white/10 md:h-10 md:w-10"
              aria-label="Actualizar"
              title="Se actualiza sola cada minuto"
            >
              <RefreshCw className={cn("h-4 w-4", loading && data && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <AgendaSkeleton />
      ) : (
        <div className={cn("flex flex-col gap-5 transition-opacity duration-200", loading && "opacity-60")}>
          <KpiStrip kpis={kpis} currency={currency} />

          {!barbers.length && !dayBookings.length ? (
            <EmptyState title="No hay barberos activos" icon={<Rose size={34} tone="light" />}>
              Cargá barberos y sus horarios para ver la agenda.
            </EmptyState>
          ) : (
            <>
              {/* Desktop / tablet */}
              <div className="hidden md:block">
                <TimeGrid
                  date={date}
                  barbers={barbers}
                  bookings={visibleBookings}
                  timeOffs={data.timeOffs}
                  nowMin={nowMin}
                  step={catalog?.settings.slotIntervalMin ?? 30}
                  onSelect={openBooking}
                  onEmptyClick={(barberId, start) => openNew({ date, barberId, start })}
                />
                <Legend />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-4 md:hidden">
                <div className="grid grid-cols-2 rounded-xl border border-line bg-surface p-0.5 text-sm" role="tablist">
                  {(
                    [
                      ["barber", "Por barbero"],
                      ["time", "Cronológico"],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "h-11 rounded-lg font-medium transition-colors duration-150",
                        mode === m ? "bg-ink text-bg" : "text-dim",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {visibleBookings.length || mode === "barber" ? (
                  <AgendaList
                    mode={mode}
                    date={date}
                    barbers={barbers}
                    bookings={visibleBookings}
                    timeOffs={data.timeOffs}
                    nowMin={nowMin}
                    currency={currency}
                    onSelect={openBooking}
                  />
                ) : (
                  <EmptyState title="Sin turnos para este día" icon={<Rose size={34} tone="light" />} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      <AdminFab
        onClick={() => openNew({ date })}
        icon={<Plus className="h-5 w-5" aria-hidden="true" />}
        title="Nuevo turno"
        revealAfterId="agenda-new-inline"
      >
        Nuevo turno
      </AdminFab>

      <BookingDrawer
        booking={(selected && data?.bookings.find((b) => b._id === selected._id)) || selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChange={applyChange}
        currency={currency}
        businessName={businessName}
        today={today}
      />
      <NewBookingSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        preset={preset}
        defaultDate={date || today}
        onCreated={(b) => {
          if (b.date !== date) goTo(b.date);
          else applyChange(b);
          load(true);
        }}
      />
    </div>
  );
}

function Legend() {
  const item = "inline-flex items-center gap-1.5";
  const sw = "inline-block h-3 w-4 rounded-[4px]";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-faint">
      <span className={item}>
        <span className={cn(sw, "border border-ink bg-card-2")} /> Confirmado
      </span>
      <span className={item}>
        <span className={cn(sw, "bg-ink")} /> Asistió
      </span>
      <span className={item}>
        <span
          className={cn(sw, "border border-line-strong")}
          style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.2) 0 2px, transparent 2px 5px)" }}
        />{" "}
        No vino
      </span>
      <span className={item}>
        <span className={cn(sw, "border border-dashed border-line-strong")} /> Cancelado
      </span>
      <span className={item}>
        <span
          className={cn(sw, "border border-line")}
          style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 4px)" }}
        />{" "}
        Bloqueo
      </span>
      <span className="ml-auto hidden lg:inline">
        Atajos: <kbd className="font-sans text-dim">←</kbd> <kbd className="font-sans text-dim">→</kbd> día ·{" "}
        <kbd className="font-sans text-dim">T</kbd> hoy · <kbd className="font-sans text-dim">N</kbd> nuevo · clic en un
        hueco para reservar
      </span>
    </div>
  );
}

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Phone-only horizontal strip of day chips (a contained scroller) centred on the selected date. */
function DayStrip({ date, today, onPick }: { date: string; today: string; onPick: (d: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const days = useMemo(() => Array.from({ length: 22 }, (_, i) => addDays(date, i - 7)), [date]);

  useEffect(() => {
    const el = scroller.current;
    const chip = el?.querySelector<HTMLElement>("[aria-current='date']");
    if (!el || !chip) return;
    const left = chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2;
    el.scrollTo({ left, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [date]);

  return (
    <div
      ref={scroller}
      className="relative -mx-4 flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:hidden [&::-webkit-scrollbar]:hidden"
      aria-label="Elegir día"
    >
      {days.map((d) => {
        const active = d === date;
        const isToday = d === today;
        const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
        return (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            aria-current={active ? "date" : undefined}
            aria-label={isToday ? `Hoy, ${formatDateLong(d)}` : formatDateLong(d)}
            className={cn(
              "relative flex h-14 w-12 shrink-0 snap-center flex-col items-center justify-center rounded-xl border text-center tabular-nums transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.95]",
              active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink",
              !active && wd === 0 && "text-faint",
            )}
          >
            <span className={cn("text-[10px] uppercase tracking-wider", active ? "text-bg/70" : "text-faint")}>
              {WEEKDAY_SHORT[wd]}
            </span>
            <span className="text-base font-semibold leading-tight">{Number(d.slice(8))}</span>
            {isToday && (
              <span
                aria-hidden="true"
                className={cn("absolute bottom-1 h-1 w-1 rounded-full", active ? "bg-bg" : "bg-ink")}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando agenda">
      <div className="h-[92px] animate-pulse rounded-[var(--radius-card)] border border-line bg-card" />
      <div className="h-[440px] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
    </div>
  );
}
