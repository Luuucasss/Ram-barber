const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function parts(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, wd };
}

/** "Jueves 30 de octubre" */
export function formatDateLong(dateISO: string) {
  const { m, d, wd } = parts(dateISO);
  return `${DAYS[wd]} ${d} de ${MONTHS[m - 1]}`;
}

/** { day: "Jue", num: 30, month: "oct" } — for date chips */
export function dateChip(dateISO: string) {
  const { m, d, wd } = parts(dateISO);
  return { day: DAYS_SHORT[wd], num: d, month: MONTHS[m - 1].slice(0, 3) };
}

export function dayName(weekday: number) {
  return DAYS[weekday];
}

export function formatPrice(amount: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Hoy", "Mañana" or the long date, given today's ISO date in the business timezone. */
export function relativeDay(dateISO: string, todayISO: string) {
  if (dateISO === todayISO) return "Hoy";
  const t = new Date(`${todayISO}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (t.toISOString().slice(0, 10) === dateISO) return "Mañana";
  return formatDateLong(dateISO);
}

/** Google Calendar "add event" link. Times are wall-clock in the given tz. */
export function googleCalendarLink(opts: {
  title: string;
  date: string;
  start: string;
  end: string;
  details?: string;
  location?: string;
  timezone: string;
}) {
  const fmt = (t: string) => `${opts.date.replace(/-/g, "")}T${t.replace(":", "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    ctz: opts.timezone,
    details: opts.details ?? "",
    location: opts.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
