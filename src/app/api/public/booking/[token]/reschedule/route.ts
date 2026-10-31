import { z } from "zod";
import { ApiError, clientIp, ok, readJson, route } from "@/lib/api";
import { rescheduleBooking } from "@/lib/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { zDate, zTime } from "@/lib/validation";
import { MUTATION_LIMIT_MSG, bookingPayload, findBookingByToken } from "../_shared";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ date: zDate, start: zTime });

export const POST = route<{ token: string }>(async (req, ctx) => {
  await rateLimit(`pub-booking-mut:${clientIp(req)}`, 10, 600, MUTATION_LIMIT_MSG);
  const { token } = await ctx.params;
  const { date, start } = await readJson(req, bodySchema);
  const booking = await findBookingByToken(token);
  try {
    const updated = await rescheduleBooking(String(booking._id), date, start, "client");
    return ok(await bookingPayload(updated));
  } catch (e) {
    if (e instanceof ApiError && e.code === "slot_taken") {
      throw new ApiError(409, "slot_taken", "Justo se ocupó ese horario. Elegí otro — tu turno actual sigue en pie.");
    }
    throw e;
  }
});
