import { z } from "zod";
import { ApiError, ok, plain, route } from "@/lib/api";
import { parseBody } from "@/app/api/admin/bookings/_shared";
import { rescheduleBooking, setBookingStatus } from "@/lib/bookings";
import { isMemberActive } from "@/lib/loyalty";
import { BOOKING_STATUSES, Booking, Client } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { zDate, zObjectId, zTime } from "@/lib/validation";
import { serializeBooking } from "../_shared";

export const dynamic = "force-dynamic";

type Params = { id: string };

async function bookingId(ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;
  const parsed = zObjectId.safeParse(id);
  if (!parsed.success) throw new ApiError(404, "not_found", "No encontramos el turno.");
  return parsed.data;
}

export const GET = route<Params>(
  async (_req, ctx) => {
    const id = await bookingId(ctx);
    const booking = await Booking.findById(id, { slotKeys: 0 }).lean();
    if (!booking) throw new ApiError(404, "not_found", "No encontramos el turno.");

    const [client, settings] = await Promise.all([Client.findById(booking.clientId).lean(), getSettings()]);
    const today = nowInTz(settings.timezone).date;

    return ok({
      booking: serializeBooking(booking),
      client: client
        ? plain({
            _id: client._id,
            name: client.name,
            phone: client.phone,
            notes: client.notes,
            stats: client.stats,
            lastVisitAt: client.lastVisitAt,
            loyalty: {
              enabled: settings.loyalty.enabled,
              stamps: client.loyalty?.stamps ?? 0,
              cycle: client.loyalty?.cycle ?? 1,
              cardSize: settings.loyalty.cardSize,
              pendingGifts: client.loyalty?.pendingCycles?.length ?? 0,
            },
            member:
              settings.membershipEnabled && isMemberActive(client, today)
                ? {
                    planName: client.membership.planName,
                    cutsRemaining: client.membership.cutsRemaining,
                    validUntil: client.membership.validUntil,
                  }
                : null,
          })
        : null,
    });
  },
  { admin: true },
);

const patchBody = z.union([
  z.object({ status: z.enum(BOOKING_STATUSES) }).strict(),
  z.object({ date: zDate, start: zTime }).strict(),
  z.object({ notes: z.string().trim().max(500) }).strict(),
]);

export const PATCH = route<Params>(
  async (req, ctx) => {
    const id = await bookingId(ctx);
    const body = await parseBody(req, patchBody);

    if ("status" in body) {
      const updated = await setBookingStatus(id, body.status, "admin");
      return ok({ booking: serializeBooking(updated) });
    }

    if ("date" in body) {
      const updated = await rescheduleBooking(id, body.date, body.start, "admin");
      return ok({ booking: serializeBooking(updated) });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set: { notes: body.notes }, $push: { history: { action: "notes", by: "admin", detail: body.notes.slice(0, 120) } } },
      { new: true, projection: { slotKeys: 0 } },
    ).lean();
    if (!updated) throw new ApiError(404, "not_found", "No encontramos el turno.");
    return ok({ booking: serializeBooking(updated) });
  },
  { admin: true },
);
