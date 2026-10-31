import { z } from "zod";
import { ok, route } from "@/lib/api";
import { createBooking } from "@/lib/bookings";
import { BOOKING_STATUSES, Booking } from "@/lib/models";
import { zDate, zObjectId, zPhone, zTime } from "@/lib/validation";
import { escapeRegex, parseBody, parseQuery, serializeBooking } from "./_shared";

export const dynamic = "force-dynamic";

const listQuery = z.object({
  from: z.union([z.literal(""), zDate]).optional(),
  to: z.union([z.literal(""), zDate]).optional(),
  status: z.union([z.literal(""), z.literal("all"), z.enum(BOOKING_STATUSES)]).optional(),
  barberId: z.union([z.literal(""), zObjectId]).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
});

export const GET = route(
  async (req) => {
    const q = parseQuery(req, listQuery);
    const filter: Record<string, unknown> = {};

    if (q.from || q.to) {
      filter.date = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
    }
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.barberId) filter.barberId = q.barberId;
    if (q.q) {
      const or: Record<string, unknown>[] = [{ clientName: { $regex: escapeRegex(q.q), $options: "i" } }];
      const digits = q.q.replace(/\D/g, "");
      if (digits.length >= 3) or.push({ clientPhone: { $regex: digits } });
      filter.$or = or;
    }

    const dir = q.sort === "asc" ? 1 : -1;
    const [items, total] = await Promise.all([
      Booking.find(filter, { slotKeys: 0 })
        .sort({ date: dir, start: dir, _id: dir })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return ok({ items: items.map(serializeBooking), total, page: q.page, pageSize: q.pageSize });
  },
  { admin: true },
);

const createBody = z.object({
  branchId: zObjectId,
  serviceId: zObjectId,
  barberId: z.union([z.literal("any"), zObjectId]),
  date: zDate,
  start: zTime,
  phone: zPhone,
  name: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(500).default(""),
});

export const POST = route(
  async (req) => {
    const body = await parseBody(req, createBody);
    const booking = await createBooking({ ...body, source: "admin" });
    return ok({ booking: serializeBooking(booking) }, { status: 201 });
  },
  { admin: true },
);
