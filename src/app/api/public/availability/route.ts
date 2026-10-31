import { z } from "zod";
import { clientIp, ok, readQuery, route } from "@/lib/api";
import { computeAvailability } from "@/lib/availability";
import type { AvailabilityResult } from "@/components/public/booking/types";
import { rateLimit } from "@/lib/rate-limit";
import { dateRange } from "@/lib/time";
import { zDate, zObjectId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  branchId: zObjectId,
  serviceId: zObjectId,
  barberId: z.union([z.literal("any"), zObjectId]),
  from: zDate,
  days: z.coerce.number().int().min(1).max(31),
});

/** Free slots for a whole date window in one round-trip (the wizard prefetches the full booking window). */
export const GET = route(async (req) => {
  await rateLimit(`availability:${clientIp(req)}`, 120, 60);
  const q = readQuery(req, schema);
  const dates = dateRange(q.from, q.days);

  const map = await computeAvailability({
    branchId: q.branchId,
    serviceId: q.serviceId,
    barberId: q.barberId,
    dates,
  });

  const result: AvailabilityResult = { days: dates.map((date) => ({ date, slots: map[date] ?? [] })) };
  return ok(result, { headers: { "Cache-Control": "no-store" } });
});
