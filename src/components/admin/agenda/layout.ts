import { toMinutes } from "@/lib/time";
import type { AdminBooking, AgendaBarber, AgendaTimeOff } from "@/components/admin/bookings/types";

export function weekdayOf(dateISO: string) {
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

/** Time-offs that apply to a barber on the agenda date (barber-specific, branch-wide or global). */
export function timeOffsFor(barber: AgendaBarber, timeOffs: AgendaTimeOff[]) {
  return timeOffs.filter(
    (t) => t.barberId === barber._id || (!t.barberId && (!t.branchId || t.branchId === barber.branchId)),
  );
}

export function rangesFor(barber: AgendaBarber, dateISO: string) {
  const wd = weekdayOf(dateISO);
  return barber.schedule
    .filter((r) => r.day === wd)
    .map((r) => [toMinutes(r.start), toMinutes(r.end)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

function overlap(a: [number, number], b: [number, number]) {
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}

/** Bookable minutes for a barber that day: schedule minus time-off. */
export function capacityMinutes(barber: AgendaBarber, dateISO: string, timeOffs: AgendaTimeOff[]) {
  const offs = timeOffsFor(barber, timeOffs);
  if (offs.some((t) => t.allDay)) return 0;
  const offRanges = offs.map((t) => [toMinutes(t.start), toMinutes(t.end)] as [number, number]);
  return rangesFor(barber, dateISO).reduce((sum, r) => {
    const blocked = offRanges.reduce((s, o) => s + overlap(r, o), 0);
    return sum + Math.max(0, r[1] - r[0] - blocked);
  }, 0);
}

export type Kpis = {
  total: number;
  completed: number;
  noShows: number;
  pending: number;
  revenue: number;
  occupancy: number | null;
};

export function computeKpis(
  dateISO: string,
  barbers: AgendaBarber[],
  bookings: AdminBooking[],
  timeOffs: AgendaTimeOff[],
): Kpis {
  const live = bookings.filter((b) => b.status !== "cancelled");
  const ids = new Set(barbers.map((b) => b._id));
  const capacity = barbers.filter((b) => b.active).reduce((s, b) => s + capacityMinutes(b, dateISO, timeOffs), 0);
  const booked = live
    .filter((b) => ids.has(b.barberId) && b.status !== "no_show")
    .reduce((s, b) => s + b.durationMin, 0);
  return {
    total: live.length,
    completed: live.filter((b) => b.status === "completed").length,
    noShows: live.filter((b) => b.status === "no_show").length,
    pending: live.filter((b) => b.status === "confirmed").length,
    revenue: live.filter((b) => b.status !== "no_show").reduce((s, b) => s + (b.finalPrice || 0), 0),
    occupancy: capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : null,
  };
}

/** Assigns side-by-side lanes to overlapping blocks (only happens when cancelled ones are shown). */
export function layoutLanes<T extends { start: string; end: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const out: { item: T; lane: number; lanes: number }[] = [];
  let cluster: { item: T; lane: number; lanes: number }[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];

  const flush = () => {
    const n = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.lanes = n));
    out.push(...cluster);
    cluster = [];
    laneEnds.length = 0;
  };

  for (const item of sorted) {
    const s = toMinutes(item.start);
    const e = toMinutes(item.end);
    if (s >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = e;
    cluster.push({ item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return out;
}
