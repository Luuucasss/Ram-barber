import type { PublicCatalog } from "@/lib/catalog";
import type { BookingCatalog } from "./types";

const ids = (list: unknown[] | undefined) => (list ?? []).map((v) => String(v));

/** Server-side: normalizes the lean catalog into the client-safe shape (string ids, only needed fields). */
export function toBookingCatalog(c: PublicCatalog): BookingCatalog {
  return {
    settings: c.settings,
    today: c.today,
    branches: c.branches.map((b) => ({
      _id: String(b._id),
      name: b.name,
      address: b.address ?? "",
      mapsUrl: b.mapsUrl ?? "",
      phone: b.phone ?? "",
    })),
    services: c.services.map((s) => ({
      _id: String(s._id),
      name: s.name,
      description: s.description ?? "",
      durationMin: s.durationMin,
      price: s.price,
      includedInPlan: Boolean(s.includedInPlan),
      branchIds: ids(s.branchIds),
    })),
    barbers: c.barbers.map((b) => ({
      _id: String(b._id),
      name: b.name,
      photoUrl: b.photoUrl ?? "",
      bio: b.bio ?? "",
      branchId: String(b.branchId),
      serviceIds: ids(b.serviceIds),
      schedule: (b.schedule ?? []).map((r) => ({ day: r.day, start: r.start, end: r.end })),
    })),
  };
}
