import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { Barber, Booking, Branch, Client, Service, type BookingDoc, type BookingStatus } from "./models";
import { ApiError, isDuplicateKey } from "./api";
import { computeAvailability } from "./availability";
import { getSettings } from "./settings";
import { isMemberActive, priceFor } from "./loyalty";
import { SLOT_GRANULARITY_MIN, minutesUntil, toHHMM, toMinutes } from "./time";

export function generateToken(): string {
  return randomBytes(18).toString("base64url");
}

export function slotKeysFor(barberId: string, date: string, start: string, end: string): string[] {
  const keys: string[] = [];
  for (let m = toMinutes(start); m < toMinutes(end); m += SLOT_GRANULARITY_MIN) keys.push(`${barberId}|${date}|${m}`);
  return keys;
}

const SLOT_TAKEN = () =>
  new ApiError(409, "slot_taken", "Justo se ocupó ese horario. Elegí otro, por favor.");

export type CreateBookingInput = {
  branchId: string;
  serviceId: string;
  barberId: string | "any";
  date: string;
  start: string;
  phone: string;
  name: string;
  notes?: string;
  source: "web" | "admin";
};

export async function createBooking(input: CreateBookingInput) {
  const settings = await getSettings();
  const [branch, service] = await Promise.all([
    Branch.findOne({ _id: input.branchId, active: true }).lean(),
    Service.findOne({ _id: input.serviceId, active: true }).lean(),
  ]);
  if (!branch) throw new ApiError(404, "branch_not_found", "La sucursal no está disponible.");
  if (!service) throw new ApiError(404, "service_not_found", "El servicio no está disponible.");

  const avail = await computeAvailability({
    branchId: input.branchId,
    serviceId: input.serviceId,
    barberId: input.barberId,
    dates: [input.date],
    admin: input.source === "admin",
    settings,
  });
  const slot = avail[input.date]?.find((s) => s.time === input.start);
  if (!slot) throw SLOT_TAKEN();

  let candidates = input.barberId === "any" ? slot.barberIds : slot.barberIds.filter((id) => id === input.barberId);
  if (!candidates.length) throw SLOT_TAKEN();

  if (candidates.length > 1) {
    const counts = await Booking.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { date: input.date, active: true, barberId: { $in: candidates.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: "$barberId", n: { $sum: 1 } } },
    ]);
    const load = new Map(counts.map((c) => [String(c._id), c.n]));
    candidates = [...candidates].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
  }

  const name = input.name.trim();
  const client = await Client.findOneAndUpdate(
    { phone: input.phone },
    { $setOnInsert: { phone: input.phone }, ...(name ? { $set: { name } } : {}) },
    { upsert: true, new: true },
  ).lean();
  if (!client) throw new ApiError(500, "client_error", "No pudimos registrar el cliente.");

  const pricing = priceFor(client, service, input.date, settings);
  const end = toHHMM(toMinutes(input.start) + service.durationMin);
  const barbers = await Barber.find({ _id: { $in: candidates } }, { name: 1 }).lean();
  const barberName = new Map(barbers.map((b) => [String(b._id), b.name]));

  for (const barberId of candidates) {
    try {
      const booking = await Booking.create({
        token: generateToken(),
        branchId: branch._id,
        barberId,
        serviceId: service._id,
        clientId: client._id,
        branchName: branch.name,
        barberName: barberName.get(barberId) ?? "",
        serviceName: service.name,
        durationMin: service.durationMin,
        price: service.price,
        includedInPlan: service.includedInPlan,
        ...pricing,
        clientName: name || client.name,
        clientPhone: input.phone,
        notes: (input.notes ?? "").trim(),
        date: input.date,
        start: input.start,
        end,
        slotKeys: slotKeysFor(barberId, input.date, input.start, end),
        source: input.source,
        history: [{ action: "created", by: input.source === "admin" ? "admin" : "client" }],
      });
      await Client.updateOne({ _id: client._id }, { $inc: { "stats.bookings": 1 } });
      return booking.toObject();
    } catch (e) {
      if (isDuplicateKey(e, "slotKeys")) continue;
      throw e;
    }
  }
  throw SLOT_TAKEN();
}

/** Whether a client (not admin) may still cancel/reschedule this booking online. */
export async function clientCanModify(booking: Pick<BookingDoc, "status" | "date" | "start">) {
  const settings = await getSettings();
  if (booking.status !== "confirmed") return { allowed: false, reason: "not_active" as const, settings };
  const mins = minutesUntil(booking.date, booking.start, settings.timezone);
  if (mins < settings.cancelLimitHours * 60) return { allowed: false, reason: "too_late" as const, settings };
  return { allowed: true, reason: null, settings };
}

export async function rescheduleBooking(bookingId: string, date: string, start: string, by: "client" | "admin") {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new ApiError(404, "not_found", "No encontramos el turno.");
  if (booking.status !== "confirmed") throw new ApiError(409, "not_active", "Este turno ya no está activo.");
  if (by === "client") {
    const check = await clientCanModify(booking);
    if (!check.allowed) {
      throw new ApiError(409, "too_late", "Ya no se puede modificar online. Escribinos por WhatsApp.");
    }
  }
  if (booking.date === date && booking.start === start) {
    throw new ApiError(400, "same_slot", "Ese es tu horario actual. Elegí uno distinto.");
  }

  const barberId = String(booking.barberId);
  const avail = await computeAvailability({
    branchId: String(booking.branchId),
    serviceId: String(booking.serviceId),
    barberId,
    dates: [date],
    excludeBookingId: bookingId,
    admin: by === "admin",
  });
  if (!avail[date]?.some((s) => s.time === start)) throw SLOT_TAKEN();

  const end = toHHMM(toMinutes(start) + booking.durationMin);
  try {
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, status: "confirmed" },
      {
        $set: { date, start, end, slotKeys: slotKeysFor(barberId, date, start, end) },
        $push: { history: { action: "rescheduled", by, detail: `${booking.date} ${booking.start} → ${date} ${start}` } },
      },
      { new: true },
    ).lean();
    if (!updated) throw new ApiError(409, "not_active", "Este turno ya no está activo.");
    return updated;
  } catch (e) {
    if (isDuplicateKey(e, "slotKeys")) throw SLOT_TAKEN();
    throw e;
  }
}

const STAT_FIELD: Partial<Record<BookingStatus, string>> = {
  completed: "stats.completed",
  cancelled: "stats.cancelled",
  no_show: "stats.noShows",
};

/**
 * Single entry point for status transitions. Keeps client stats, loyalty stamps
 * and membership cuts consistent, and frees/re-claims slots on cancel/restore.
 */
export async function setBookingStatus(bookingId: string, next: BookingStatus, by: "client" | "admin") {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new ApiError(404, "not_found", "No encontramos el turno.");
  const prev = booking.status as BookingStatus;
  if (prev === next) return booking;

  if (by === "client") {
    if (next !== "cancelled") throw new ApiError(403, "forbidden", "Acción no permitida.");
    const check = await clientCanModify(booking);
    if (!check.allowed) {
      throw new ApiError(
        409,
        check.reason ?? "not_active",
        check.reason === "too_late"
          ? "Ya no se puede cancelar online. Escribinos por WhatsApp."
          : "Este turno ya no está activo.",
      );
    }
  }

  const set: Record<string, unknown> = { status: next, active: next !== "cancelled" };
  if (next === "cancelled") {
    set.cancelledAt = new Date();
    set.cancelledBy = by;
  }
  if (prev === "cancelled") {
    set.cancelledAt = null;
    set.cancelledBy = "";
  }

  const filter = { _id: booking._id, status: prev };
  let updated;
  try {
    updated = await Booking.findOneAndUpdate(
      filter,
      { $set: set, $push: { history: { action: `status:${next}`, by } } },
      { new: true },
    ).lean();
  } catch (e) {
    if (isDuplicateKey(e, "slotKeys")) {
      throw new ApiError(409, "slot_taken", "Ese horario ya fue tomado por otro turno; no se puede restaurar.");
    }
    throw e;
  }
  if (!updated) throw new ApiError(409, "conflict", "El turno cambió mientras tanto. Recargá e intentá de nuevo.");

  const inc: Record<string, number> = {};
  if (STAT_FIELD[prev]) inc[STAT_FIELD[prev]!] = -1;
  if (STAT_FIELD[next]) inc[STAT_FIELD[next]!] = 1;
  if (Object.keys(inc).length) await Client.updateOne({ _id: booking.clientId }, { $inc: inc });

  if (next === "completed") await applyCompletion(String(booking._id));
  if (prev === "completed") await revertCompletion(String(booking._id));

  return (await Booking.findById(bookingId).lean())!;
}

async function applyCompletion(bookingId: string) {
  const settings = await getSettings();
  const booking = await Booking.findById(bookingId).lean();
  if (!booking || booking.loyaltyApplied) return;
  const client = await Client.findById(booking.clientId);
  if (!client) return;

  let membershipApplied = false;
  if (settings.membershipEnabled && booking.includedInPlan && isMemberActive(client, booking.date)) {
    client.membership.cutsRemaining = Math.max(0, client.membership.cutsRemaining - 1);
    membershipApplied = true;
  } else if (settings.loyalty.enabled) {
    client.loyalty.stamps += 1;
    client.loyalty.totalCuts += 1;
    if (client.loyalty.stamps >= settings.loyalty.cardSize) {
      if (settings.loyalty.steps.some((s) => s.gift)) client.loyalty.pendingCycles.push(client.loyalty.cycle);
      client.loyalty.cycle += 1;
      client.loyalty.stamps = 0;
    }
  }
  client.lastVisitAt = new Date();
  await client.save();
  await Booking.updateOne({ _id: bookingId }, { $set: { loyaltyApplied: true, membershipApplied } });
}

async function revertCompletion(bookingId: string) {
  const settings = await getSettings();
  const booking = await Booking.findById(bookingId).lean();
  if (!booking || !booking.loyaltyApplied) return;
  const client = await Client.findById(booking.clientId);
  if (client) {
    if (booking.membershipApplied) {
      client.membership.cutsRemaining += 1;
    } else if (client.loyalty.stamps > 0) {
      client.loyalty.stamps -= 1;
      client.loyalty.totalCuts = Math.max(0, client.loyalty.totalCuts - 1);
    } else if (client.loyalty.cycle > 1) {
      const prevCycle = client.loyalty.cycle - 1;
      const redeemed = client.loyalty.redemptions.some((r) => r.cycle === prevCycle);
      if (!redeemed) {
        client.loyalty.pendingCycles = client.loyalty.pendingCycles.filter((c) => c !== prevCycle);
        client.loyalty.cycle = prevCycle;
        client.loyalty.stamps = settings.loyalty.cardSize - 1;
        client.loyalty.totalCuts = Math.max(0, client.loyalty.totalCuts - 1);
      }
    }
    await client.save();
  }
  await Booking.updateOne({ _id: bookingId }, { $set: { loyaltyApplied: false, membershipApplied: false } });
}

/** Public-safe projection of a booking (used by client-facing endpoints). */
export function publicBooking(b: BookingDoc, opts: { canModify?: boolean } = {}) {
  return {
    token: b.token,
    status: b.status,
    date: b.date,
    start: b.start,
    end: b.end,
    branchId: String(b.branchId),
    barberId: String(b.barberId),
    serviceId: String(b.serviceId),
    branchName: b.branchName,
    barberName: b.barberName,
    serviceName: b.serviceName,
    durationMin: b.durationMin,
    price: b.price,
    discountPercent: b.discountPercent,
    finalPrice: b.finalPrice,
    membershipApplied: b.membershipApplied,
    clientName: b.clientName.split(" ")[0] ?? "",
    notes: b.notes,
    canModify: opts.canModify ?? false,
  };
}
export type PublicBooking = ReturnType<typeof publicBooking>;
