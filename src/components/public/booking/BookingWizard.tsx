"use client";

import "./booking.css";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client-api";
import { BarberStep, BranchStep, IdentityBanner, ServiceStep, pricingFor } from "./ChoiceSteps";
import { ConfirmStep, type Summary } from "./ConfirmStep";
import { DateTimeStep, type AvailabilityState } from "./DateTimeStep";
import { Notice, StepHeader, WizardTopBar } from "./parts";
import { PhoneStep } from "./PhoneStep";
import { STORAGE_KEYS, appendStoredBooking, readStorage, writeStorage } from "./storage";
import { SuccessStep } from "./SuccessStep";
import {
  barberDoesService,
  serviceInBranch,
  type AvailabilityResult,
  type BookingCatalog,
  type CreatedBooking,
  type IdentifyResult,
} from "./types";

type StepId = "phone" | "branch" | "service" | "barber" | "datetime" | "confirm" | "done";
const ORDER: StepId[] = ["phone", "branch", "service", "barber", "datetime", "confirm"];

const TITLES: Record<StepId, string> = {
  phone: "Identificación",
  branch: "Sucursal",
  service: "Servicio",
  barber: "Barbero",
  datetime: "Día y hora",
  confirm: "Confirmar",
  done: "Listo",
};

type Selection = {
  phone: string;
  identity: IdentifyResult | null;
  branchId: string | null;
  serviceId: string | null;
  barberId: string | null;
  date: string | null;
  time: string | null;
  name: string;
  notes: string;
};

const HISTORY_KEY = "rbStep";
const isStep = (v: unknown): v is StepId => typeof v === "string" && (ORDER as string[]).includes(v);

/** Loads the catalog client-side when the server could not (DB hiccup), then renders the wizard. */
export function BookingApp({
  initialCatalog,
  initialServiceId,
}: {
  initialCatalog: BookingCatalog | null;
  initialServiceId?: string | null;
}) {
  const [catalog, setCatalog] = useState<BookingCatalog | null>(initialCatalog);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (catalog) return;
    const ctrl = new AbortController();
    setError(null);
    api<BookingCatalog>("/api/public/catalog", { signal: ctrl.signal })
      .then(setCatalog)
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof ApiClientError ? e.message : "No pudimos cargar la información. Probá de nuevo.");
      });
    return () => ctrl.abort();
  }, [catalog, attempt]);

  if (!catalog) {
    return error ? (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-dim">{error}</p>
        <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </Button>
      </div>
    ) : (
      <Spinner label="Cargando…" className="py-24" />
    );
  }
  return <BookingWizard catalog={catalog} initialServiceId={initialServiceId ?? null} />;
}

export function BookingWizard({ catalog, initialServiceId }: { catalog: BookingCatalog; initialServiceId: string | null }) {
  const { settings, today, branches, services, barbers } = catalog;
  const router = useRouter();

  const [step, setStep] = useState<StepId>("phone");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [sel, setSel] = useState<Selection>({
    phone: "",
    identity: null,
    branchId: null,
    serviceId: initialServiceId,
    barberId: null,
    date: null,
    time: null,
    name: "",
    notes: "",
  });
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<React.ReactNode>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle" });
  const [availKey, setAvailKey] = useState<string | null>(null);
  const [availNonce, setAvailNonce] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepRef = useRef(step);
  const selRef = useRef(sel);
  const firstRender = useRef(true);
  const jumpedRef = useRef(false);
  const pickTimer = useRef<number | null>(null);
  stepRef.current = step;
  selRef.current = sel;

  /* ---------- Derived selection (auto-skip single choices) ---------- */
  const branchId = branches.length === 1 ? branches[0]._id : sel.branchId;
  const branch = branches.find((b) => b._id === branchId) ?? null;

  const branchBarbers = useMemo(() => barbers.filter((b) => b.branchId === branchId), [barbers, branchId]);
  const branchServices = useMemo(
    () =>
      branchId
        ? services.filter((s) => serviceInBranch(s, branchId) && branchBarbers.some((b) => barberDoesService(b, s._id)))
        : [],
    [services, branchId, branchBarbers],
  );
  const service = branchServices.find((s) => s._id === sel.serviceId) ?? null;
  const eligibleBarbers = useMemo(
    () => (service ? branchBarbers.filter((b) => barberDoesService(b, service._id)) : branchBarbers),
    [branchBarbers, service],
  );
  const barberId = eligibleBarbers.length === 1 ? eligibleBarbers[0]._id : sel.barberId;
  const barber = eligibleBarbers.find((b) => b._id === barberId) ?? null;

  const skipped = useCallback(
    (s: StepId) => (s === "branch" ? branches.length <= 1 : s === "barber" ? eligibleBarbers.length <= 1 : false),
    [branches.length, eligibleBarbers.length],
  );
  const visible = ORDER.filter((s) => !skipped(s));

  const canEnter = useCallback(
    (s: StepId): boolean => {
      switch (s) {
        case "phone":
          return true;
        case "branch":
          return Boolean(sel.identity);
        case "service":
          return Boolean(sel.identity && branchId);
        case "barber":
          return Boolean(sel.identity && branchId && service);
        case "datetime":
          return Boolean(sel.identity && branchId && service && barberId);
        case "confirm":
          return Boolean(sel.identity && branchId && service && barberId && sel.date && sel.time);
        default:
          return false;
      }
    },
    [sel.identity, sel.date, sel.time, branchId, service, barberId],
  );

  /* ---------- Navigation (mirrored in browser history so the phone's back button works) ---------- */
  useEffect(() => {
    try {
      window.history.replaceState({ ...window.history.state, [HISTORY_KEY]: "phone" }, "");
    } catch {
      /* ignore */
    }
    const onPop = (e: PopStateEvent) => {
      const target = (e.state as Record<string, unknown> | null)?.[HISTORY_KEY];
      if (stepRef.current === "done") {
        router.replace("/");
        return;
      }
      if (!isStep(target)) return;
      setDir(ORDER.indexOf(target) < ORDER.indexOf(stepRef.current) ? "back" : "fwd");
      setNotice((n) => (target === "datetime" ? n : null));
      setStep(target);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [router]);

  // If history lands on a step whose prerequisites are gone (e.g. forward after a reset), fall back.
  useEffect(() => {
    if (step === "done" || (canEnter(step) && !skipped(step))) return;
    const fallback = [...ORDER].reverse().find((s) => ORDER.indexOf(s) < ORDER.indexOf(step) && canEnter(s) && !skipped(s));
    setStep(fallback ?? "phone");
  }, [step, canEnter, skipped]);

  /** Moves forward to the first non-skipped step after `from`, pushing one history entry per step passed. */
  const goForward = useCallback(
    (from: StepId, opts: { jumpTo?: StepId } = {}) => {
      const start = ORDER.indexOf(from);
      const path: StepId[] = [];
      for (let i = start + 1; i < ORDER.length; i++) {
        const s = ORDER[i];
        if (skipped(s)) continue;
        path.push(s);
        if (!opts.jumpTo || s === opts.jumpTo) break;
      }
      if (!path.length) return;
      try {
        for (const s of path) window.history.pushState({ ...window.history.state, [HISTORY_KEY]: s }, "");
      } catch {
        /* ignore */
      }
      setDir("fwd");
      setStep(path[path.length - 1]);
    },
    [skipped],
  );
  const goForwardRef = useRef(goForward);
  goForwardRef.current = goForward;

  const goBack = useCallback(() => {
    const prev = [...visible].slice(0, visible.indexOf(step)).pop();
    if (!prev) {
      router.push("/");
      return;
    }
    const st = (window.history.state as Record<string, unknown> | null)?.[HISTORY_KEY];
    if (st === step) {
      window.history.back(); // popstate handler moves us
    } else {
      setDir("back");
      setStep(prev);
    }
  }, [visible, step, router]);

  // Focus the new step's heading for screen readers and bring the wizard into view.
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  /* ---------- Availability (whole window in one request, prefetched as soon as it's knowable) ---------- */
  const days = Math.min(31, Math.max(1, settings.bookingWindowDays));
  const wantedKey = branchId && service && barberId ? `${branchId}|${service._id}|${barberId}` : null;

  useEffect(() => {
    if (!wantedKey) return;
    const [b, s, br] = wantedKey.split("|");
    const ctrl = new AbortController();
    setAvailKey(wantedKey);
    setAvailability({ status: "loading" });
    const qs = new URLSearchParams({ branchId: b, serviceId: s, barberId: br, from: today, days: String(days) });
    api<AvailabilityResult>(`/api/public/availability?${qs}`, { signal: ctrl.signal })
      .then((r) => setAvailability({ status: "ready", days: r.days }))
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setAvailability({
          status: "error",
          message: e instanceof ApiClientError ? e.message : "No pudimos cargar los horarios. Probá de nuevo.",
        });
      });
    return () => ctrl.abort();
  }, [wantedKey, today, days, availNonce]);

  const avail: AvailabilityState = availKey === wantedKey ? availability : { status: "loading" };
  const availDays = avail.status === "ready" ? avail.days : null;
  const selectedDate = useMemo(() => {
    if (!availDays) return sel.date;
    const has = (d: string | null) => Boolean(d && availDays.find((x) => x.date === d)?.slots.length);
    return has(sel.date) ? sel.date : (availDays.find((d) => d.slots.length)?.date ?? null);
  }, [availDays, sel.date]);
  const selectedTime =
    availDays && selectedDate && availDays.find((d) => d.date === selectedDate)?.slots.some((s) => s.time === sel.time)
      ? sel.time
      : null;

  /* ---------- Actions ---------- */
  const identify = useCallback(
    async (phone: string) => {
      setIdentifying(true);
      setIdentifyError(null);
      try {
        const identity = await api<IdentifyResult>("/api/public/identify", { body: { phone } });
        writeStorage(STORAGE_KEYS.phone, identity.phone);
        const storedTel = readStorage(STORAGE_KEYS.phone);
        const storedName = (readStorage(STORAGE_KEYS.name) ?? "").trim();
        setSel((s) => ({
          ...s,
          phone: identity.phone,
          identity,
          name: s.name || (storedTel === identity.phone && storedName ? storedName : (identity.firstName ?? "")),
        }));
        // Coming from a service link on the home page: jump straight past the service step (once).
        const jump =
          !jumpedRef.current &&
          initialServiceId &&
          selRef.current.serviceId === initialServiceId &&
          branchServices.some((x) => x._id === initialServiceId) &&
          identity.upcomingCount < 3;
        if (jump) {
          jumpedRef.current = true;
          goForward("phone", { jumpTo: ORDER.slice(ORDER.indexOf("service") + 1).find((x) => !skipped(x)) });
        } else {
          goForward("phone");
        }
      } catch (e) {
        setIdentifyError(e instanceof ApiClientError ? e.message : "Ocurrió un error. Probá de nuevo.");
      } finally {
        setIdentifying(false);
      }
    },
    [goForward, initialServiceId, branchServices, skipped],
  );

  const pick = useCallback((from: StepId, patch: Partial<Selection>) => {
    setSel((s) => ({ ...s, ...patch }));
    setNotice(null);
    // Let the selection settle visually before the step slides away. Reads the ref so the
    // skip rules reflect the new selection (e.g. a service only one barber does).
    if (pickTimer.current) window.clearTimeout(pickTimer.current);
    pickTimer.current = window.setTimeout(() => {
      pickTimer.current = null;
      if (stepRef.current === from) goForwardRef.current(from); // ignore double taps / stale timers
    }, 170);
  }, []);
  useEffect(() => () => {
    if (pickTimer.current) window.clearTimeout(pickTimer.current);
  }, []);

  const confirm = useCallback(async () => {
    if (!service || !branchId || !barberId || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await api<CreatedBooking>("/api/public/bookings", {
        body: {
          branchId,
          serviceId: service._id,
          barberId,
          date: selectedDate,
          start: selectedTime,
          phone: sel.phone,
          name: sel.name.trim(),
          notes: sel.notes.trim(),
        },
      });
      writeStorage(STORAGE_KEYS.name, sel.name.trim());
      appendStoredBooking({ token: created.token, date: created.date, start: created.start });
      setBooking(created);
      try {
        window.history.replaceState({ ...window.history.state, [HISTORY_KEY]: "done" }, "");
      } catch {
        /* ignore */
      }
      setDir("fwd");
      setStep("done");
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "slot_taken") {
        setNotice("Justo se ocupó ese horario. Elegí otro, por favor.");
        setSel((s) => ({ ...s, time: null }));
        setAvailNonce((n) => n + 1);
        goBack();
      } else if (e instanceof ApiClientError && e.code === "too_many") {
        setSubmitError(
          <>
            {e.message}{" "}
            <Link href="/mis-turnos" className="font-semibold underline underline-offset-4">
              Ir a Mis turnos
            </Link>
          </>,
        );
      } else {
        setSubmitError(e instanceof ApiClientError ? e.message : "Ocurrió un error. Probá de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [service, branchId, barberId, selectedDate, selectedTime, sel.phone, sel.name, sel.notes, goBack]);

  /* ---------- Render ---------- */
  if (!branches.length || !barbers.length) {
    return (
      <div className="py-10">
        <Notice tone="warn">
          Todavía no hay turnos disponibles para reservar online. Escribinos por WhatsApp y te damos un lugar.
        </Notice>
      </div>
    );
  }

  const summary: Summary | null =
    service && selectedDate && selectedTime
      ? {
          service: service.name,
          durationMin: service.durationMin,
          barber:
            barberId === "any"
              ? (() => {
                  const ids = availDays?.find((d) => d.date === selectedDate)?.slots.find((s) => s.time === selectedTime)?.barberIds;
                  const only = ids?.length === 1 ? barbers.find((b) => b._id === ids[0]) : null;
                  return only?.name ?? "Primer disponible";
                })()
              : (barber?.name ?? ""),
          branch: branches.length > 1 ? (branch?.name ?? null) : null,
          date: selectedDate,
          time: selectedTime,
          price: service.price,
          pricing: pricingFor(service, sel.identity, settings),
          currency: settings.currency,
        }
      : null;

  if (step === "done" && booking) {
    // The server's booking is the source of truth for what was actually reserved and charged.
    const doneSummary: Summary = {
      service: booking.serviceName,
      durationMin: booking.durationMin,
      barber: booking.barberName,
      branch: branches.length > 1 ? booking.branchName : null,
      date: booking.date,
      time: booking.start,
      price: booking.price,
      pricing: {
        final: booking.finalPrice,
        percent: booking.discountPercent,
        label: booking.membershipApplied
          ? "Incluido en tu plan"
          : booking.discountPercent > 0
            ? `${booking.discountPercent}% off Fidelidad RAM`
            : null,
        membership: booking.membershipApplied,
      },
      currency: settings.currency,
    };
    return (
      <div className="rb-step pt-2">
        <SuccessStep
          booking={booking}
          summary={doneSummary}
          businessName={settings.businessName}
          address={branch?.address || settings.address}
          timezone={settings.timezone}
          whatsapp={settings.whatsapp}
        />
      </div>
    );
  }

  const index = Math.max(0, visible.indexOf(step));
  const blocked = (sel.identity?.upcomingCount ?? 0) >= 3;

  let header: { title: string; subtitle?: React.ReactNode };
  let body: React.ReactNode;
  switch (step) {
    case "phone":
      header = {
        title: "¡Hola! Necesitamos que te identifiques",
        subtitle: "Con tu celular guardamos el turno y lo podés gestionar después.",
      };
      body = (
        <PhoneStep initialPhone={sel.phone} loading={identifying} error={identifyError} onSubmit={identify} />
      );
      break;
    case "branch":
      header = { title: "Elegí la sucursal" };
      body = <BranchStep branches={branches} selectedId={sel.branchId} onSelect={(id) => pick("branch", { branchId: id, time: null })} />;
      break;
    case "service":
      header = { title: "¿Qué te hacemos?", subtitle: "Elegí el servicio." };
      body = (
        <>
          {sel.identity && <IdentityBanner identity={sel.identity} settings={settings} />}
          {blocked ? (
            <Notice tone="warn">
              Ya tenés {sel.identity?.upcomingCount} turnos reservados, que es el máximo online. Para sacar otro, cancelá
              alguno desde{" "}
              <Link href="/mis-turnos" className="font-semibold underline underline-offset-4">
                Mis turnos
              </Link>{" "}
              o escribinos por WhatsApp.
            </Notice>
          ) : (
            <ServiceStep
              services={branchServices}
              selectedId={sel.serviceId}
              identity={sel.identity}
              settings={settings}
              onSelect={(id) =>
                pick("service", {
                  serviceId: id,
                  time: null,
                  barberId:
                    sel.barberId && sel.barberId !== "any" && !barbers.find((b) => b._id === sel.barberId && barberDoesService(b, id))
                      ? null
                      : sel.barberId,
                })
              }
            />
          )}
        </>
      );
      break;
    case "barber":
      header = { title: "¿Con quién?", subtitle: "Elegí tu barbero o dejá que te asignemos el primero libre." };
      body = (
        <BarberStep barbers={eligibleBarbers} selectedId={sel.barberId} onSelect={(id) => pick("barber", { barberId: id, time: null })} />
      );
      break;
    case "datetime":
      header = {
        title: "Elegí día y hora",
        subtitle: service ? (
          <span>
            {service.name}
            {barberId === "any" ? " · Primer disponible" : barber ? ` · con ${barber.name}` : ""}
          </span>
        ) : undefined,
      };
      body = (
        <DateTimeStep
          availability={avail}
          today={today}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          durationMin={service?.durationMin ?? 30}
          notice={notice}
          onSelectDate={(date) => setSel((s) => ({ ...s, date, time: null }))}
          onSelectTime={(time) => pick("datetime", { date: selectedDate, time })}
          onRetry={() => setAvailNonce((n) => n + 1)}
        />
      );
      break;
    case "confirm":
      header = { title: "Confirmá tu turno", subtitle: "Revisá que esté todo bien." };
      body = summary ? (
        <ConfirmStep
          summary={summary}
          phone={sel.phone}
          name={sel.name}
          notes={sel.notes}
          cancelLimitHours={settings.cancelLimitHours}
          submitting={submitting}
          error={submitError}
          onName={(name) => setSel((s) => ({ ...s, name }))}
          onNotes={(notes) => setSel((s) => ({ ...s, notes }))}
          onConfirm={confirm}
        />
      ) : (
        <Spinner />
      );
      break;
    default:
      header = { title: "" };
      body = null;
  }

  return (
    <div>
      <WizardTopBar
        index={index}
        total={visible.length}
        title={TITLES[step]}
        onBack={step === "phone" ? undefined : goBack}
        backHref="/"
      />
      <div key={step} className="rb-step" data-dir={dir}>
        <StepHeader ref={headingRef} numeral={index} title={header.title} subtitle={header.subtitle} />
        {body}
      </div>
    </div>
  );
}
