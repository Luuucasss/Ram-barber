import { z } from "zod";
import { ApiError } from "@/lib/api";
import { clientCanModify, publicBooking } from "@/lib/bookings";
import { Booking, Branch, type BookingDoc } from "@/lib/models";
import { minutesUntil, nowInTz } from "@/lib/time";

/** Tokens are `randomBytes(18).toString("base64url")`; accept a lenient superset. */
const zToken = z.string().regex(/^[A-Za-z0-9_-]{10,64}$/);

const notFound = () =>
  new ApiError(404, "not_found", "No encontramos este turno. Revisá que el link esté completo.");

export async function findBookingByToken(raw: string): Promise<BookingDoc> {
  const parsed = zToken.safeParse(raw);
  if (!parsed.success) throw notFound();
  const booking = await Booking.findOne({ token: parsed.data }).lean<BookingDoc>();
  if (!booking) throw notFound();
  return booking;
}

/** Everything the public "manage my booking" page needs, recomputed after every mutation. */
export async function bookingPayload(booking: BookingDoc) {
  const check = await clientCanModify(booking);
  const settings = check.settings;
  const branch = await Branch.findById(booking.branchId, { name: 1, address: 1, mapsUrl: 1 }).lean();
  return {
    booking: publicBooking(booking, { canModify: check.allowed }),
    canModify: check.allowed,
    /** Why it can't be modified: "too_late" | "not_active" | null. */
    reason: check.reason,
    /** Minutes from now until the booking starts (negative once it started). */
    minutesUntil: minutesUntil(booking.date, booking.start, settings.timezone),
    cancelLimitHours: settings.cancelLimitHours,
    timezone: settings.timezone,
    currency: settings.currency,
    today: nowInTz(settings.timezone).date,
    whatsapp: settings.whatsapp,
    branch: {
      name: branch?.name ?? booking.branchName,
      address: branch?.address ?? "",
      mapsUrl: branch?.mapsUrl ?? "",
    },
  };
}
export type BookingPayload = Awaited<ReturnType<typeof bookingPayload>>;

export const MUTATION_LIMIT_MSG =
  "Hiciste muchos cambios seguidos. Esperá un rato e intentá de nuevo, o escribinos por WhatsApp.";
