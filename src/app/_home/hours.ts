import type { ScheduleRange } from "@/lib/models";

const SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type HoursRow = { days: string; ranges: string[]; closed: boolean };

/** Union of every barber's schedule per weekday, merged and grouped: "Lun a Sáb · 09:30–13:00 / 14:30–21:30". */
export function deriveHours(schedules: ScheduleRange[][]): HoursRow[] {
  const perDay = new Map<number, string[]>();
  for (const day of WEEK) {
    const ranges = schedules
      .flat()
      .filter((r) => r.day === day)
      .map((r) => [toMin(r.start), toMin(r.end)] as [number, number])
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([...r]);
    }
    perDay.set(day, merged.map(([s, e]) => `${toHHMM(s)}–${toHHMM(e)}`));
  }

  const rows: HoursRow[] = [];
  let group: number[] = [];
  const flush = () => {
    if (!group.length) return;
    const ranges = perDay.get(group[0]) ?? [];
    rows.push({ days: label(group), ranges, closed: ranges.length === 0 });
    group = [];
  };
  for (const day of WEEK) {
    const key = (perDay.get(day) ?? []).join("|");
    const prevKey = group.length ? (perDay.get(group[0]) ?? []).join("|") : null;
    if (prevKey !== null && prevKey !== key) flush();
    group.push(day);
  }
  flush();
  return rows;
}

function label(days: number[]) {
  if (days.length === 1) return SHORT[days[0]];
  if (days.length === 2) return `${SHORT[days[0]]} y ${SHORT[days[1]]}`;
  return `${SHORT[days[0]]} a ${SHORT[days[days.length - 1]]}`;
}

/** One-line summary of the open groups, e.g. "Lun a Sáb · 09:30–13:00 / 14:30–21:30". */
export function hoursSummary(rows: HoursRow[]): string | null {
  const open = rows.filter((r) => !r.closed);
  if (!open.length) return null;
  return open.map((r) => `${r.days} · ${r.ranges.join(" / ")}`).join("  ·  ");
}
