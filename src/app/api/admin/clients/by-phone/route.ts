import { z } from "zod";
import { ok, plain, route } from "@/lib/api";
import { parseQuery } from "@/app/api/admin/bookings/_shared";
import { isMemberActive } from "@/lib/loyalty";
import { Client } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { zPhone } from "@/lib/validation";

export const dynamic = "force-dynamic";

const query = z.object({ phone: zPhone });

/** Lookup used to autofill the "Nuevo turno" form. Returns `{ client: null }` when unknown. */
export const GET = route(
  async (req) => {
    const { phone } = parseQuery(req, query);
    const [client, settings] = await Promise.all([
      Client.findOne({ phone }, { name: 1, phone: 1, notes: 1, stats: 1, lastVisitAt: 1, loyalty: 1, membership: 1 }).lean(),
      getSettings(),
    ]);
    if (!client) return ok({ client: null });
    const today = nowInTz(settings.timezone).date;
    return ok({
      client: plain({
        _id: client._id,
        name: client.name,
        phone: client.phone,
        notes: client.notes,
        stats: client.stats,
        lastVisitAt: client.lastVisitAt,
        stamps: client.loyalty?.stamps ?? 0,
        cardSize: settings.loyalty.cardSize,
        member: settings.membershipEnabled && isMemberActive(client, today),
      }),
    });
  },
  { admin: true },
);
