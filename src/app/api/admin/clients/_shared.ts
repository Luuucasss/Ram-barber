import { ApiError, plain } from "@/lib/api";
import { loyaltyView } from "@/lib/loyalty";
import { Booking, Client, Plan } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { zObjectId } from "@/lib/validation";
import { serializeBooking } from "../bookings/_shared";

export type ClientParams = { id: string };

export async function clientIdFrom(ctx: { params: Promise<ClientParams> }) {
  const { id } = await ctx.params;
  if (!zObjectId.safeParse(id).success) throw new ApiError(404, "not_found", "No encontramos el cliente.");
  return id;
}

/** Full admin view of a client: profile, recent bookings, plans to assign and loyalty state. */
export async function clientDetail(id: string) {
  const [client, settings] = await Promise.all([Client.findById(id).lean(), getSettings()]);
  if (!client) throw new ApiError(404, "not_found", "No encontramos el cliente.");
  const today = nowInTz(settings.timezone).date;

  const [bookings, plans] = await Promise.all([
    Booking.find({ clientId: client._id }, { slotKeys: 0 }).sort({ date: -1, start: -1 }).limit(50).lean(),
    Plan.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
  ]);

  return {
    client: plain(client),
    bookings: bookings.map(serializeBooking),
    plans: plain(plans),
    loyalty: loyaltyView(client, settings, today),
    today,
    settings: {
      loyalty: settings.loyalty,
      membershipEnabled: settings.membershipEnabled,
      currency: settings.currency,
      timezone: settings.timezone,
      businessName: settings.businessName,
    },
  };
}
