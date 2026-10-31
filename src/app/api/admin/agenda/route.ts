import { z } from "zod";
import { ok, plain, route } from "@/lib/api";
import { Barber, Booking, TimeOff } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { zDate } from "@/lib/validation";
import { parseQuery, serializeBooking } from "../bookings/_shared";

export const dynamic = "force-dynamic";

const query = z.object({ date: z.union([z.literal(""), zDate]).optional() });

export const GET = route(
  async (req) => {
    const q = parseQuery(req, query);
    const settings = await getSettings();
    const today = nowInTz(settings.timezone).date;
    const date = q.date || today;

    const [bookings, barbers, timeOffs] = await Promise.all([
      Booking.find({ date }, { slotKeys: 0 }).sort({ start: 1 }).lean(),
      Barber.find({}, { name: 1, photoUrl: 1, branchId: 1, schedule: 1, active: 1, order: 1 })
        .sort({ order: 1, name: 1 })
        .lean(),
      TimeOff.find({ dateFrom: { $lte: date }, dateTo: { $gte: date } }).lean(),
    ]);

    // Inactive barbers only show up when they still hold bookings that day.
    const withBookings = new Set(bookings.map((b) => String(b.barberId)));
    const visibleBarbers = barbers.filter((b) => b.active || withBookings.has(String(b._id)));

    return ok({
      date,
      today,
      barbers: plain(visibleBarbers),
      bookings: bookings.map(serializeBooking),
      timeOffs: plain(timeOffs),
      settings: { timezone: settings.timezone, currency: settings.currency },
    });
  },
  { admin: true },
);
