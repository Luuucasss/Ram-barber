import { z } from "zod";
import { clientIp, ok, readJson, route } from "@/lib/api";
import { publicBooking, type PublicBooking } from "@/lib/bookings";
import { Booking, Client, type BookingDoc } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { minutesUntil, nowInTz, toMinutes } from "@/lib/time";
import { zPhone } from "@/lib/validation";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ phone: zPhone });

export type MyBookingsResponse = {
  firstName: string;
  today: string;
  cancelLimitHours: number;
  upcoming: PublicBooking[];
  past: PublicBooking[];
};

export const POST = route(async (req) => {
  await rateLimit(
    `pub-my-bookings:${clientIp(req)}`,
    10,
    600,
    "Hiciste muchas búsquedas seguidas. Esperá un rato e intentá de nuevo, o escribinos por WhatsApp.",
  );
  const { phone } = await readJson(req, bodySchema);
  const settings = await getSettings();
  const now = nowInTz(settings.timezone);

  const [client, docs] = await Promise.all([
    Client.findOne({ phone }, { name: 1 }).lean(),
    Booking.find({ clientPhone: phone }).sort({ date: -1, start: -1 }).limit(120).lean<BookingDoc[]>(),
  ]);

  // A confirmed booking stays "upcoming" until it ends (so a cut in progress still shows up).
  const isUpcoming = (b: BookingDoc) =>
    b.status === "confirmed" && (b.date > now.date || (b.date === now.date && toMinutes(b.end) > now.minutes));
  const limitMin = settings.cancelLimitHours * 60;

  const upcoming = docs
    .filter(isUpcoming)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((b) => publicBooking(b, { canModify: minutesUntil(b.date, b.start, settings.timezone) >= limitMin }));
  const past = docs
    .filter((b) => !isUpcoming(b))
    .slice(0, 5)
    .map((b) => publicBooking(b));

  const name = client?.name || docs[0]?.clientName || "";
  const data: MyBookingsResponse = {
    firstName: name.trim().split(/\s+/)[0] ?? "",
    today: now.date,
    cancelLimitHours: settings.cancelLimitHours,
    upcoming,
    past,
  };
  return ok(data);
});
