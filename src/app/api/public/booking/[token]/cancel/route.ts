import { clientIp, ok, route } from "@/lib/api";
import { setBookingStatus } from "@/lib/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { MUTATION_LIMIT_MSG, bookingPayload, findBookingByToken } from "../_shared";

export const dynamic = "force-dynamic";

export const POST = route<{ token: string }>(async (req, ctx) => {
  await rateLimit(`pub-booking-mut:${clientIp(req)}`, 10, 600, MUTATION_LIMIT_MSG);
  const { token } = await ctx.params;
  const booking = await findBookingByToken(token);
  // Enforces status + cancelLimitHours and frees the slot.
  const updated = await setBookingStatus(String(booking._id), "cancelled", "client");
  return ok(await bookingPayload(updated));
});
