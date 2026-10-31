import { z } from "zod";
import { ApiError, clientIp, ok, readJson, route } from "@/lib/api";
import { createBooking, publicBooking } from "@/lib/bookings";
import { Booking, type BookingDoc } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { nowInTz, toHHMM } from "@/lib/time";
import { zDate, zObjectId, zPhone, zTime } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_UPCOMING = 3;

const schema = z.object({
  branchId: zObjectId,
  serviceId: zObjectId,
  barberId: z.union([z.literal("any"), zObjectId]),
  date: zDate,
  start: zTime,
  phone: zPhone,
  name: z.string().trim().min(2, "Ingresá tu nombre.").max(60),
  notes: z.string().trim().max(300).optional().default(""),
});

export const POST = route(async (req) => {
  await rateLimit(
    `bookings:${clientIp(req)}`,
    10,
    600,
    "Hiciste muchas reservas seguidas. Esperá unos minutos o escribinos por WhatsApp.",
  );
  const input = await readJson(req, schema);

  const settings = await getSettings();
  const now = nowInTz(settings.timezone);
  const upcoming = await Booking.countDocuments({
    clientPhone: input.phone,
    status: "confirmed",
    $or: [{ date: { $gt: now.date } }, { date: now.date, start: { $gte: toHHMM(now.minutes) } }],
  });
  if (upcoming >= MAX_UPCOMING) {
    throw new ApiError(
      409,
      "too_many",
      `Ya tenés ${upcoming} turnos reservados. Cancelá alguno desde "Mis turnos" o escribinos por WhatsApp.`,
    );
  }

  const booking = await createBooking({ ...input, source: "web" });
  return ok(publicBooking(booking as unknown as BookingDoc, { canModify: true }), { status: 201 });
});
