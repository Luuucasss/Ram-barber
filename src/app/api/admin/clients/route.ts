import { z } from "zod";
import { ok, plain, route } from "@/lib/api";
import { isMemberActive } from "@/lib/loyalty";
import { Client } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { escapeRegex, parseQuery } from "../bookings/_shared";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["recent", "name", "visits"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const SORTS = {
  recent: { lastVisitAt: -1, updatedAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
  visits: { "stats.completed": -1, _id: -1 },
} as const;

export const GET = route(
  async (req) => {
    const q = parseQuery(req, query);
    const filter: Record<string, unknown> = {};
    if (q.q) {
      const or: Record<string, unknown>[] = [{ name: { $regex: escapeRegex(q.q), $options: "i" } }];
      const digits = q.q.replace(/\D/g, "");
      if (digits.length >= 3) or.push({ phone: { $regex: digits } });
      filter.$or = or;
    }

    const [docs, total, settings] = await Promise.all([
      Client.find(filter, { name: 1, phone: 1, stats: 1, lastVisitAt: 1, loyalty: 1, membership: 1, createdAt: 1 })
        .sort(SORTS[q.sort])
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      Client.countDocuments(filter),
      getSettings(),
    ]);
    const today = nowInTz(settings.timezone).date;

    const items = docs.map((c) => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      stats: c.stats,
      lastVisitAt: c.lastVisitAt,
      createdAt: c.createdAt,
      stamps: c.loyalty?.stamps ?? 0,
      pendingGifts: c.loyalty?.pendingCycles?.length ?? 0,
      member: settings.membershipEnabled && isMemberActive(c, today),
      planName: c.membership?.planName ?? "",
    }));

    return ok({
      items: plain(items),
      total,
      page: q.page,
      pageSize: q.pageSize,
      cardSize: settings.loyalty.cardSize,
      loyaltyEnabled: settings.loyalty.enabled,
    });
  },
  { admin: true },
);
