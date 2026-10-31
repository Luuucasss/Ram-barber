import type { Types } from "mongoose";
import { ApiError, plain } from "@/lib/api";
import { Barber, Booking, Branch, TimeOff } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";
import { timeOffSchema } from "@/lib/validation";
import type { CrudConfig } from "../branches/_crud";

type TimeOffLike = {
  _id: Types.ObjectId;
  branchId: Types.ObjectId | null;
  barberId: Types.ObjectId | null;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  start: string;
  end: string;
};

async function today() {
  const settings = await getSettings();
  return nowInTz(settings.timezone).date;
}

/**
 * Confirmed, still-active bookings (from today on) that fall inside a time-off window.
 * Time-offs never cancel bookings automatically; the admin sees this count as a warning.
 */
export async function countOverlappingBookings(t: TimeOffLike, fromDate: string): Promise<number> {
  const from = t.dateFrom > fromDate ? t.dateFrom : fromDate;
  if (from > t.dateTo) return 0;
  const filter: Record<string, unknown> = { active: true, status: "confirmed", date: { $gte: from, $lte: t.dateTo } };
  if (t.barberId) filter.barberId = t.barberId;
  else if (t.branchId) filter.branchId = t.branchId;
  if (!t.allDay && t.start && t.end) {
    filter.start = { $lt: t.end };
    filter.end = { $gt: t.start };
  }
  return Booking.countDocuments(filter);
}

export const timeOffCrud: CrudConfig = {
  model: TimeOff,
  label: "El bloqueo",
  sort: { dateFrom: 1, start: 1, createdAt: 1 },
  parseCreate: (body) => timeOffSchema.parse(body),
  // The schema has cross-field rules, so PATCH validates the merged record as a whole.
  parsePatch: (body, existing) =>
    timeOffSchema.parse({ ...plain(existing), ...(typeof body === "object" && body ? body : {}) }),
  check: async (data) => {
    if (data.allDay) {
      data.start = "";
      data.end = "";
    }
    if (typeof data.barberId === "string") {
      if (!(await Barber.exists({ _id: data.barberId }))) {
        throw new ApiError(400, "invalid_barber", "El barbero elegido no existe.");
      }
      data.branchId = null; // barber scope wins; branch is implied by the barber
    } else if (typeof data.branchId === "string" && !(await Branch.exists({ _id: data.branchId }))) {
      throw new ApiError(400, "invalid_branch", "La sucursal elegida no existe.");
    }
    return data;
  },
  afterWrite: async (item) => ({
    overlappingBookings: await countOverlappingBookings(item as unknown as TimeOffLike, await today()),
  }),
  list: async (items) => {
    const day = await today();
    const decorated = await Promise.all(
      items.map(async (raw) => {
        const t = raw as unknown as TimeOffLike;
        return { ...raw, overlappingBookings: t.dateTo >= day ? await countOverlappingBookings(t, day) : 0 };
      }),
    );
    return { items: decorated, today: day };
  },
};
