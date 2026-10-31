import { z } from "zod";
import { ApiError, clientIp, ok, readQuery, route } from "@/lib/api";
import { computeAvailability } from "@/lib/availability";
import { clientCanModify } from "@/lib/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { addDays, dateRange, nowInTz } from "@/lib/time";
import { zDate } from "@/lib/validation";
import { findBookingByToken } from "../_shared";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: zDate.optional(),
  days: z.coerce.number().int().min(1).max(90).optional(),
});

export type RescheduleAvailability = {
  today: string;
  lastDate: string;
  current: { date: string; start: string };
  days: { date: string; slots: string[] }[];
};

export const GET = route<{ token: string }>(async (req, ctx) => {
  await rateLimit(`pub-booking-avail:${clientIp(req)}`, 60, 600);
  const { token } = await ctx.params;
  const q = readQuery(req, querySchema);
  const booking = await findBookingByToken(token);

  const check = await clientCanModify(booking);
  if (!check.allowed) {
    throw new ApiError(
      409,
      check.reason ?? "not_active",
      check.reason === "too_late"
        ? "Ya no se puede modificar online. Escribinos por WhatsApp."
        : "Este turno ya no está activo.",
    );
  }
  const settings = check.settings;
  const today = nowInTz(settings.timezone).date;
  const lastDate = addDays(today, settings.bookingWindowDays - 1);
  const from = q.from && q.from > today ? q.from : today;
  const dates = dateRange(from, q.days ?? settings.bookingWindowDays).filter((d) => d <= lastDate);

  // Same barber/service/branch; the booking itself doesn't block its own slots.
  const map = await computeAvailability({
    branchId: String(booking.branchId),
    serviceId: String(booking.serviceId),
    barberId: String(booking.barberId),
    dates,
    excludeBookingId: String(booking._id),
    settings,
  });

  const data: RescheduleAvailability = {
    today,
    lastDate,
    current: { date: booking.date, start: booking.start },
    days: dates.map((date) => ({ date, slots: (map[date] ?? []).map((s) => s.time) })),
  };
  return ok(data);
});
