/** Pure helpers for weekly schedules. Shared by the admin editor (client) and the barbers API (server). */

export type Range = { start: string; end: string };
export type DayRange = Range & { day: number };

/** Monday-first display order (0 = Sunday in storage). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;
export const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
export const DAY_LETTER = ["D", "L", "M", "M", "J", "V", "S"] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(min: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 55, min));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Returns a human error for one day's ranges, or null when valid. */
export function validateDayRanges(ranges: Range[]): string | null {
  for (const r of ranges) {
    if (!HHMM.test(r.start) || !HHMM.test(r.end)) return "Completá las horas de inicio y fin.";
    if (toMin(r.start) % 5 || toMin(r.end) % 5) return "Usá horarios en pasos de 5 minutos.";
    if (toMin(r.start) >= toMin(r.end)) return "El inicio tiene que ser anterior al fin.";
  }
  const sorted = [...ranges].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (toMin(sorted[i].start) < toMin(sorted[i - 1].end)) return "Los turnos de este día se superponen.";
  }
  return null;
}

/** Sorts by day/start and validates every day. Returns the error with its day, if any. */
export function normalizeSchedule(schedule: DayRange[]): { schedule: DayRange[]; error: { day: number; message: string } | null } {
  const sorted = [...schedule].sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));
  for (const day of WEEK_ORDER) {
    const message = validateDayRanges(sorted.filter((r) => r.day === day));
    if (message) return { schedule: sorted, error: { day, message } };
  }
  return { schedule: sorted.map(({ day, start, end }) => ({ day, start, end })), error: null };
}

export function totalMinutes(ranges: Range[]): number {
  return ranges.reduce((acc, r) => {
    if (!HHMM.test(r.start) || !HHMM.test(r.end)) return acc;
    return acc + Math.max(0, toMin(r.end) - toMin(r.start));
  }, 0);
}

export function formatHours(min: number): string {
  if (!min) return "0 h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

function shortTime(hhmm: string) {
  return hhmm.endsWith(":00") ? String(Number(hhmm.slice(0, 2))) : `${Number(hhmm.slice(0, 2))}:${hhmm.slice(3)}`;
}

/**
 * Compact weekly summary grouping consecutive days with identical hours (Monday first).
 * e.g. ["Lun–Vie 9:30–13 · 14:30–21:30", "Sáb 10–14"]
 */
export function summarizeSchedule(schedule: DayRange[]): string[] {
  const key = (day: number) =>
    schedule
      .filter((r) => r.day === day)
      .sort((a, b) => toMin(a.start) - toMin(b.start))
      .map((r) => `${shortTime(r.start)}–${shortTime(r.end)}`)
      .join(" · ");
  const lines: string[] = [];
  let i = 0;
  while (i < WEEK_ORDER.length) {
    const k = key(WEEK_ORDER[i]);
    let j = i;
    while (j + 1 < WEEK_ORDER.length && key(WEEK_ORDER[j + 1]) === k) j++;
    if (k) {
      const from = DAY_SHORT[WEEK_ORDER[i]];
      const to = DAY_SHORT[WEEK_ORDER[j]];
      lines.push(`${i === j ? from : `${from}–${to}`} ${k}`);
    }
    i = j + 1;
  }
  return lines;
}
