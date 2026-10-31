import { Types } from "mongoose";
import { Barber, Booking, Service, TimeOff, type BarberDoc, type ServiceDoc } from "./models";
import { ApiError } from "./api";
import { getSettings } from "./settings";
import type { AppSettings } from "./validation";
import { addDays, nowInTz, overlaps, toHHMM, toMinutes, weekday } from "./time";

export type Slot = { time: string; barberIds: string[] };
export type SlotMap = Record<string, Slot[]>;

export type AvailabilityInput = {
  branchId: string;
  serviceId: string;
  /** A barber id, or "any" for every eligible barber in the branch. */
  barberId: string;
  dates: string[];
  excludeBookingId?: string;
  /** Admin mode: skips min-notice and booking-window limits (still no past dates). */
  admin?: boolean;
  settings?: AppSettings;
};

export function barberDoesService(barber: Pick<BarberDoc, "serviceIds">, serviceId: string) {
  return !barber.serviceIds?.length || barber.serviceIds.some((id) => String(id) === serviceId);
}

export function serviceInBranch(service: Pick<ServiceDoc, "branchIds">, branchId: string) {
  return !service.branchIds?.length || service.branchIds.some((id) => String(id) === branchId);
}

export async function computeAvailability(input: AvailabilityInput): Promise<SlotMap> {
  const settings = input.settings ?? (await getSettings());
  const result: SlotMap = Object.fromEntries(input.dates.map((d) => [d, [] as Slot[]]));
  if (!input.dates.length) return result;

  const service = await Service.findOne({ _id: input.serviceId, active: true }).lean();
  if (!service || !serviceInBranch(service, input.branchId)) {
    throw new ApiError(404, "service_not_found", "Ese servicio no está disponible.");
  }

  const barberFilter: Record<string, unknown> = { branchId: input.branchId, active: true };
  if (input.barberId !== "any") barberFilter._id = input.barberId;
  const barbers = (await Barber.find(barberFilter).lean()).filter((b) => barberDoesService(b, input.serviceId));
  if (!barbers.length) return result;

  const { date: today, minutes: nowMin } = nowInTz(settings.timezone);
  const lastDate = addDays(today, settings.bookingWindowDays - 1);
  const dates = input.dates.filter((d) => d >= today && (input.admin || d <= lastDate));
  if (!dates.length) return result;

  const barberIds = barbers.map((b) => b._id);
  const sorted = [...dates].sort();
  const bookingFilter: Record<string, unknown> = { barberId: { $in: barberIds }, date: { $in: dates }, active: true };
  if (input.excludeBookingId) bookingFilter._id = { $ne: new Types.ObjectId(input.excludeBookingId) };

  const [bookings, timeOffs] = await Promise.all([
    Booking.find(bookingFilter, { barberId: 1, date: 1, start: 1, end: 1 }).lean(),
    TimeOff.find({
      dateFrom: { $lte: sorted[sorted.length - 1] },
      dateTo: { $gte: sorted[0] },
      $or: [
        { barberId: { $in: barberIds } },
        { barberId: null, branchId: new Types.ObjectId(input.branchId) },
        { barberId: null, branchId: null },
      ],
    }).lean(),
  ]);

  const duration = service.durationMin;
  const step = settings.slotIntervalMin;
  const minStart = input.admin ? 0 : nowMin + settings.minNoticeMin;

  for (const date of dates) {
    const wd = weekday(date);
    const byTime = new Map<number, string[]>();

    for (const barber of barbers) {
      const bid = String(barber._id);
      const offs = timeOffs.filter(
        (t) => t.dateFrom <= date && t.dateTo >= date && (!t.barberId || String(t.barberId) === bid),
      );
      if (offs.some((t) => t.allDay)) continue;

      const busy: [number, number][] = [
        ...bookings
          .filter((b) => b.date === date && String(b.barberId) === bid)
          .map((b) => [toMinutes(b.start), toMinutes(b.end)] as [number, number]),
        ...offs.map((t) => [toMinutes(t.start), toMinutes(t.end)] as [number, number]),
      ];

      for (const range of barber.schedule.filter((r) => r.day === wd)) {
        const rEnd = toMinutes(range.end);
        for (let t = toMinutes(range.start); t + duration <= rEnd; t += step) {
          if (date === today && t < minStart) continue;
          if (busy.some(([s, e]) => overlaps(t, t + duration, s, e))) continue;
          const list = byTime.get(t) ?? [];
          if (!list.includes(bid)) list.push(bid);
          byTime.set(t, list);
        }
      }
    }

    result[date] = [...byTime.entries()]
      .sort(([a], [b]) => a - b)
      .map(([t, ids]) => ({ time: toHHMM(t), barberIds: ids }));
  }

  return result;
}
