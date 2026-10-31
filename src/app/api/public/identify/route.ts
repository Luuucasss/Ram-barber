import { z } from "zod";
import { clientIp, ok, readJson, route } from "@/lib/api";
import { Booking, Client } from "@/lib/models";
import { loyaltyView } from "@/lib/loyalty";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { nowInTz, toHHMM } from "@/lib/time";
import { zPhone } from "@/lib/validation";
import type { IdentifyResult } from "@/components/public/booking/types";

export const dynamic = "force-dynamic";

const schema = z.object({ phone: zPhone });

/**
 * Phone-first identification for the booking flow. Deliberately returns only what the
 * wizard needs (first name, how many upcoming bookings, the next-visit perk) and nothing else.
 */
export const POST = route(async (req) => {
  await rateLimit(`identify:${clientIp(req)}`, 20, 600);
  const { phone } = await readJson(req, schema);

  const settings = await getSettings();
  const now = nowInTz(settings.timezone);

  const client = await Client.findOne({ phone }, { name: 1, loyalty: 1, membership: 1, lastVisitAt: 1 }).lean();

  const upcomingCount = client
    ? await Booking.countDocuments({
        clientPhone: phone,
        status: "confirmed",
        $or: [{ date: { $gt: now.date } }, { date: now.date, start: { $gte: toHHMM(now.minutes) } }],
      })
    : 0;

  const view = loyaltyView(client, settings, now.date);
  const firstName = client?.name?.trim().split(/\s+/)[0] || null;

  const result: IdentifyResult = {
    phone,
    firstName,
    upcomingCount,
    loyalty: {
      nextPercent: view.enabled ? view.next.percent : 0,
      nextGift: view.enabled && view.next.gift,
      member: Boolean(view.member),
    },
  };
  return ok(result);
});
