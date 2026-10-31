export const SLOT_GRANULARITY_MIN = 5;

export function nowInTz(tz: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addDays(dateISO: string, n: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(dateISO: string): number {
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

export function dateRange(fromISO: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(fromISO, i));
}

/** Minutes from "now" (in tz) until date+time. Negative if already past. */
export function minutesUntil(dateISO: string, hhmm: string, tz: string): number {
  const now = nowInTz(tz);
  const dayDiff = Math.round(
    (Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86_400_000,
  );
  return dayDiff * 1440 + toMinutes(hhmm) - now.minutes;
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
