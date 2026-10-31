import { z } from "zod";
import { ok, route } from "@/lib/api";
import { parseQuery } from "@/app/api/admin/bookings/_shared";
import { computeAvailability } from "@/lib/availability";
import { zDate, zObjectId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const query = z.object({
  branchId: zObjectId,
  serviceId: zObjectId,
  barberId: z.union([z.literal("any"), zObjectId]).default("any"),
  date: zDate,
  excludeBookingId: z.union([z.literal(""), zObjectId]).optional(),
});

/** Admin slot lookup: ignores min-notice and booking window (past dates are still excluded). */
export const GET = route(
  async (req) => {
    const q = parseQuery(req, query);
    const map = await computeAvailability({
      branchId: q.branchId,
      serviceId: q.serviceId,
      barberId: q.barberId,
      dates: [q.date],
      excludeBookingId: q.excludeBookingId || undefined,
      admin: true,
    });
    return ok({ slots: map[q.date] ?? [] });
  },
  { admin: true },
);
