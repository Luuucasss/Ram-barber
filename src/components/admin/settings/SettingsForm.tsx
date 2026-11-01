"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Megaphone, Store, CalendarClock } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, Card, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { Logo, Rose } from "@/components/ornaments";
import { api, ApiClientError } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/validation";
import { SetupCard } from "./SetupCard";

/* ───────────────────────── options ───────────────────────── */

const AR_ZONES = [
  ["America/Argentina/Buenos_Aires", "Buenos Aires / CABA"],
  ["America/Argentina/Cordoba", "Córdoba"],
  ["America/Argentina/Mendoza", "Mendoza"],
  ["America/Argentina/Salta", "Salta"],
  ["America/Argentina/Jujuy", "Jujuy"],
  ["America/Argentina/Tucuman", "Tucumán"],
  ["America/Argentina/Catamarca", "Catamarca"],
  ["America/Argentina/La_Rioja", "La Rioja"],
  ["America/Argentina/San_Juan", "San Juan"],
  ["America/Argentina/San_Luis", "San Luis"],
  ["America/Argentina/Rio_Gallegos", "Santa Cruz"],
  ["America/Argentina/Ushuaia", "Tierra del Fuego"],
] as const;

const OTHER_ZONES = [
  ["America/Montevideo", "Montevideo"],
  ["America/Santiago", "Santiago de Chile"],
  ["America/Asuncion", "Asunción"],
  ["America/Sao_Paulo", "São Paulo"],
  ["America/La_Paz", "La Paz"],
  ["America/Lima", "Lima"],
  ["America/Bogota", "Bogotá"],
  ["America/Mexico_City", "Ciudad de México"],
  ["America/New_York", "Nueva York"],
  ["Europe/Madrid", "Madrid"],
  ["UTC", "UTC"],
] as const;

const CURRENCIES = [
  ["ARS", "Peso argentino (ARS)"],
  ["USD", "Dólar (USD)"],
  ["UYU", "Peso uruguayo (UYU)"],
  ["CLP", "Peso chileno (CLP)"],
  ["EUR", "Euro (EUR)"],
] as const;

const SLOT_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const NOTICE_OPTIONS: [number, string][] = [
  [0, "Sin anticipación"],
  [15, "15 minutos"],
  [30, "30 minutos"],
  [60, "1 hora"],
  [120, "2 horas"],
  [180, "3 horas"],
  [360, "6 horas"],
  [720, "12 horas"],
  [1440, "1 día"],
  [2880, "2 días"],
];

/* ───────────────────────── draft model ───────────────────────── */

type Draft = {
  businessName: string;
  tagline: string;
  logoUrl: string;
  whatsapp: string;
  instagram: string;
  address: string;
  timezone: string;
  currency: string;
  slotIntervalMin: string;
  bookingWindowDays: string;
  minNoticeMin: string;
  cancelLimitHours: string;
  announcement: string;
};

function toDraft(s: AppSettings): Draft {
  return {
    businessName: s.businessName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    address: s.address,
    timezone: s.timezone,
    currency: s.currency,
    slotIntervalMin: String(s.slotIntervalMin),
    bookingWindowDays: String(s.bookingWindowDays),
    minNoticeMin: String(s.minNoticeMin),
    cancelLimitHours: String(s.cancelLimitHours),
    announcement: s.announcement,
  };
}

function validate(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  if (!d.businessName.trim()) e.businessName = "Ingresá el nombre del negocio.";
  if (d.businessName.length > 60) e.businessName = "Máximo 60 caracteres.";
  if (d.tagline.length > 100) e.tagline = "Máximo 100 caracteres.";
  if (d.logoUrl.trim() && !d.logoUrl.trim().startsWith("/") && !/^https?:\/\//i.test(d.logoUrl.trim()))
    e.logoUrl = "Usá un link https://… o una ruta como /logo.jpg";
  if (d.whatsapp && !/^\d{10,15}$/.test(d.whatsapp)) e.whatsapp = "Entre 10 y 15 dígitos, con código de país (54) y el 9.";
  if (d.instagram.length > 60) e.instagram = "Demasiado largo.";
  if (d.announcement.length > 300) e.announcement = "Máximo 300 caracteres.";
  const slot = int(d.slotIntervalMin);
  if (!(slot >= 5 && slot <= 120 && slot % 5 === 0)) e.slotIntervalMin = "Entre 5 y 120 minutos, de a 5.";
  const win = int(d.bookingWindowDays);
  if (!(win >= 1 && win <= 90)) e.bookingWindowDays = "Entre 1 y 90 días.";
  const notice = int(d.minNoticeMin);
  if (!(notice >= 0 && notice <= 10080)) e.minNoticeMin = "Valor inválido.";
  const cancel = Number(d.cancelLimitHours.replace(",", "."));
  if (d.cancelLimitHours.trim() === "" || !(cancel >= 0 && cancel <= 168)) e.cancelLimitHours = "Entre 0 y 168 horas.";
  return e;
}

function toSettings(d: Draft, base: AppSettings): AppSettings {
  return {
    ...base,
    businessName: d.businessName.trim(),
    tagline: d.tagline.trim(),
    logoUrl: d.logoUrl.trim(),
    whatsapp: d.whatsapp,
    instagram: d.instagram.trim().replace(/^@+/, ""),
    address: d.address.trim(),
    timezone: d.timezone,
    currency: d.currency,
    slotIntervalMin: Number(d.slotIntervalMin),
    bookingWindowDays: Number(d.bookingWindowDays),
    minNoticeMin: Number(d.minNoticeMin),
    cancelLimitHours: Number(d.cancelLimitHours.replace(",", ".")),
    announcement: d.announcement.trim(),
  };
}

/** Accepts "@ram", "ram" or a pasted instagram.com URL; keeps only the handle. */
function cleanInstagram(v: string) {
  const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return (m ? m[1] : v).replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "");
}

/* ───────────────────────── component ───────────────────────── */

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseline = useMemo(() => JSON.stringify(toDraft(saved)), [saved]);
  const dirty = JSON.stringify(draft) !== baseline;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustSaved(false);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const save = useCallback(async () => {
    const errs = validate(draft);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      setFormError("Revisá los campos marcados.");
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const next = await api<AppSettings>("/api/admin/settings", { method: "PUT", body: toSettings(draft, saved) });
      setSaved(next);
      setDraft(toDraft(next));
      setJustSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setJustSaved(false), 2200);
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [draft, saved]);

  // Warn before leaving with unsaved changes; Ctrl/⌘+S saves.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("keydown", onKey);
    };
  }, [dirty, saving, save]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const tzKnown = [...AR_ZONES, ...OTHER_ZONES].some(([z]) => z === draft.timezone);
  const slotOptions = SLOT_OPTIONS.includes(Number(draft.slotIntervalMin)) ? SLOT_OPTIONS : [...SLOT_OPTIONS, Number(draft.slotIntervalMin)].sort((a, b) => a - b);
  const noticeOptions = NOTICE_OPTIONS.some(([v]) => String(v) === draft.minNoticeMin)
    ? NOTICE_OPTIONS
    : [...NOTICE_OPTIONS, [Number(draft.minNoticeMin), `${draft.minNoticeMin} minutos`] as [number, string]].sort((a, b) => a[0] - b[0]);
  const barVisible = dirty || justSaved;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      noValidate
      className="pb-28"
    >
      <AdminPageHeader title="Configuración" description="Datos del negocio y reglas de reserva." />

      <div className="flex max-w-3xl flex-col gap-6">
        {/* Negocio */}
        <Card className="flex flex-col gap-5 p-4 sm:p-5">
          <GroupTitle icon={Store} title="Negocio" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Nombre" error={errors.businessName}>
              {(id) => <Input id={id} value={draft.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={60} aria-invalid={!!errors.businessName} />}
            </Field>
            <Field label="Frase / tagline" error={errors.tagline}>
              {(id) => <Input id={id} value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={100} placeholder="Barbería & estilo" aria-invalid={!!errors.tagline} />}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <Field
              label="Logo (URL)"
              error={errors.logoUrl}
              hint="Imagen negra sobre fondo blanco: en el sitio se invierte a blanco automáticamente. Vacío = logo por defecto."
            >
              {(id) => (
                <Input
                  id={id}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={draft.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="/logo.jpg"
                  aria-invalid={!!errors.logoUrl}
                />
              )}
            </Field>
            <LogoPreview src={draft.logoUrl.trim()} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="WhatsApp"
              error={errors.whatsapp}
              hint={
                draft.whatsapp && !errors.whatsapp ? (
                  <a href={`https://wa.me/${draft.whatsapp}`} target="_blank" rel="noreferrer" className="-my-3.5 inline-flex items-center gap-1 py-3.5 text-ink underline underline-offset-4 sm:my-0 sm:py-0">
                    Probar en WhatsApp <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  "Solo números: 54 + 9 + área + número, sin 0 ni 15. Ej.: 5493513704782"
                )
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={draft.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 15))}
                  placeholder="5493513704782"
                  className="tabular-nums"
                  aria-invalid={!!errors.whatsapp}
                />
              )}
            </Field>
            <Field
              label="Instagram"
              error={errors.instagram}
              hint={
                draft.instagram ? (
                  <a href={`https://instagram.com/${draft.instagram}`} target="_blank" rel="noreferrer" className="-my-3.5 inline-flex items-center gap-1 py-3.5 text-ink underline underline-offset-4 sm:my-0 sm:py-0">
                    Ver @{draft.instagram} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  "Usuario sin @ (también podés pegar el link del perfil)."
                )
              }
            >
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim">@</span>
                  <Input
                    id={id}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={draft.instagram}
                    onChange={(e) => set("instagram", cleanInstagram(e.target.value))}
                    className="pl-8"
                    placeholder="ramhairstudio"
                    aria-invalid={!!errors.instagram}
                  />
                </div>
              )}
            </Field>
          </div>

          <Field label="Dirección" hint="Se muestra en el sitio. Cada sucursal tiene además la suya.">
            {(id) => <Input id={id} value={draft.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />}
          </Field>
        </Card>

        {/* Reservas */}
        <Card className="flex flex-col gap-5 p-4 sm:p-5">
          <GroupTitle icon={CalendarClock} title="Reservas" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Intervalo entre horarios" error={errors.slotIntervalMin} hint="Cada cuánto se ofrecen turnos (ej.: 30 min → 9:00, 9:30, 10:00…).">
              {(id) => (
                <Select id={id} value={draft.slotIntervalMin} onChange={(e) => set("slotIntervalMin", e.target.value)}>
                  {slotOptions.map((m) => (
                    <option key={m} value={m}>
                      Cada {m} minutos
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Reservar con hasta" error={errors.bookingWindowDays} hint="Días hacia adelante que muestra el calendario (1 a 90).">
              {(id) => (
                <div className="relative">
                  <Input
                    id={id}
                    inputMode="numeric"
                    value={draft.bookingWindowDays}
                    onChange={(e) => set("bookingWindowDays", e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="pr-44 tabular-nums"
                    aria-invalid={!!errors.bookingWindowDays}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm text-faint">días de anticipación</span>
                </div>
              )}
            </Field>
            <Field label="Anticipación mínima" error={errors.minNoticeMin} hint="Cuánto antes como mínimo se puede reservar un turno.">
              {(id) => (
                <Select id={id} value={draft.minNoticeMin} onChange={(e) => set("minNoticeMin", e.target.value)}>
                  {noticeOptions.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Cancelación online"
              error={errors.cancelLimitHours}
              hint={Number(draft.cancelLimitHours) === 0 ? "El cliente puede cancelar hasta la hora del turno." : `El cliente puede cancelar hasta ${draft.cancelLimitHours || "…"} h antes del turno.`}
            >
              {(id) => (
                <div className="relative">
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={draft.cancelLimitHours}
                    onChange={(e) => set("cancelLimitHours", e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
                    className="pr-24 tabular-nums"
                    aria-invalid={!!errors.cancelLimitHours}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm text-faint">horas antes</span>
                </div>
              )}
            </Field>
            <Field label="Zona horaria" hint={<LocalTime tz={draft.timezone} />}>
              {(id) => (
                <Select id={id} value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
                  <optgroup label="Argentina">
                    {AR_ZONES.map(([z, label]) => (
                      <option key={z} value={z}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Otras">
                    {OTHER_ZONES.map(([z, label]) => (
                      <option key={z} value={z}>
                        {label}
                      </option>
                    ))}
                    {!tzKnown && <option value={draft.timezone}>{draft.timezone}</option>}
                  </optgroup>
                </Select>
              )}
            </Field>
            <Field label="Moneda">
              {(id) => (
                <Select id={id} value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map(([c, label]) => (
                    <option key={c} value={c}>
                      {label}
                    </option>
                  ))}
                  {!CURRENCIES.some(([c]) => c === draft.currency) && <option value={draft.currency}>{draft.currency}</option>}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        {/* Anuncio */}
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <GroupTitle icon={Megaphone} title="Anuncio" />
          <Field
            label="Texto del banner"
            error={errors.announcement}
            hint={
              <span className="flex justify-between gap-3">
                <span>Se muestra arriba en la página de inicio. Vacío = sin banner.</span>
                <span className={cn("tabular-nums", draft.announcement.length > 300 && "font-semibold text-ink")}>{draft.announcement.length}/300</span>
              </span>
            }
          >
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.announcement}
                onChange={(e) => set("announcement", e.target.value)}
                placeholder="Ej.: El 24 y 31 de diciembre atendemos hasta las 18 h."
                aria-invalid={!!errors.announcement}
              />
            )}
          </Field>
          {draft.announcement.trim() && (
            <div className="flex animate-[fade_200ms_ease-out_both] items-center justify-center gap-2 rounded-xl border border-line-strong bg-ink px-4 py-2 text-center text-sm font-medium text-bg">
              <Rose size={16} tone="dark" className="shrink-0" />
              <span className="min-w-0 break-words">{draft.announcement.trim()}</span>
            </div>
          )}
        </Card>

        <SetupCard />
      </div>

      {/* Sticky save bar: slides up while there are unsaved changes, confirms the save, then leaves.
          On phones/tablets it parks right above the admin tab bar (which already clears the home
          indicator); on desktop there is no tab bar, so it pads for the safe area itself. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[var(--admin-tabbar-h,0px)] z-40 px-3 pb-3 transition-[transform,opacity] duration-300 lg:left-[240px] lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          barVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+var(--admin-tabbar-h,0px))] opacity-0 duration-200",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
        inert={!barVisible}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-line-strong bg-card-2/95 p-3 shadow-[0_-10px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur sm:flex-row sm:items-center sm:pl-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm" aria-live="polite">
            {justSaved && !dirty ? (
              <span className="flex items-center gap-2 text-ink">
                <Check className="h-4 w-4" aria-hidden="true" /> Cambios guardados
              </span>
            ) : formError ? (
              <ErrorText className="border-0 bg-transparent p-0">{formError}</ErrorText>
            ) : (
              <span className="flex items-center gap-2 text-ink">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-ink" aria-hidden="true" /> Tenés cambios sin guardar
              </span>
            )}
          </div>
          {dirty && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 flex-1 sm:flex-none sm:pointer-fine:h-9"
                disabled={saving}
                onClick={() => {
                  setDraft(toDraft(saved));
                  setErrors({});
                  setFormError("");
                }}
              >
                Descartar
              </Button>
              <Button type="submit" size="sm" className="h-11 flex-[2] sm:flex-none sm:pointer-fine:h-9" loading={saving}>
                Guardar cambios
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function GroupTitle({ icon: Icon, title }: { icon: typeof Store; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-dim">
      <Icon className="h-4 w-4" aria-hidden="true" /> {title}
    </h2>
  );
}

function LogoPreview({ src }: { src: string }) {
  const [status, setStatus] = useState<{ src: string; ok: boolean } | null>(null);
  const effective = src || "/logo.jpg";
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setStatus({ src: effective, ok: true });
    img.onerror = () => alive && setStatus({ src: effective, ok: false });
    img.src = effective;
    return () => {
      alive = false;
    };
  }, [effective]);
  const failed = status?.src === effective && !status.ok;
  return (
    <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg p-3 sm:mt-6 sm:w-40" aria-label="Vista previa del logo">
      {failed ? (
        <span className="text-center text-xs font-medium text-ink">No se pudo cargar la imagen</span>
      ) : (
        <Logo key={effective} src={effective} className="max-h-full max-w-full animate-[fade_200ms_ease-out_both] object-contain" />
      )}
    </div>
  );
}

function LocalTime({ tz }: { tz: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => {
      try {
        setNow(new Intl.DateTimeFormat("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()));
      } catch {
        setNow(null);
      }
    };
    fmt();
    const t = setInterval(fmt, 30_000);
    return () => clearInterval(t);
  }, [tz]);
  return <span>{now ? `Hora actual ahí: ${now}. Define "hoy" y los horarios del turnero.` : "Define \"hoy\" y los horarios del turnero."}</span>;
}
