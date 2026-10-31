import { clientIp, ok, route } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { bookingPayload, findBookingByToken } from "./_shared";

export const dynamic = "force-dynamic";

export const GET = route<{ token: string }>(async (req, ctx) => {
  await rateLimit(`pub-booking:${clientIp(req)}`, 60, 600);
  const { token } = await ctx.params;
  const booking = await findBookingByToken(token);
  return ok(await bookingPayload(booking));
});
