import type { AppSettings } from "@/lib/validation";
import type { ScheduleRange } from "@/lib/models";

/** Client-safe catalog shapes (ids as strings). Built on the server by `toBookingCatalog`. */
export type CatalogBranch = { _id: string; name: string; address: string; mapsUrl: string; phone: string };
export type CatalogService = {
  _id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  includedInPlan: boolean;
  branchIds: string[];
};
export type CatalogBarber = {
  _id: string;
  name: string;
  photoUrl: string;
  bio: string;
  branchId: string;
  serviceIds: string[];
  schedule: ScheduleRange[];
};
export type BookingCatalog = {
  settings: AppSettings;
  today: string;
  branches: CatalogBranch[];
  services: CatalogService[];
  barbers: CatalogBarber[];
};

/** POST /api/public/identify */
export type IdentifyResult = {
  phone: string;
  firstName: string | null;
  upcomingCount: number;
  loyalty: { nextPercent: number; nextGift: boolean; member: boolean };
};

export type AvailableSlot = { time: string; barberIds: string[] };

/** GET /api/public/availability */
export type AvailabilityResult = { days: { date: string; slots: AvailableSlot[] }[] };

/** POST /api/public/bookings (mirror of `PublicBooking` from lib/bookings, kept client-safe). */
export type CreatedBooking = {
  token: string;
  status: string;
  date: string;
  start: string;
  end: string;
  branchId: string;
  barberId: string;
  serviceId: string;
  branchName: string;
  barberName: string;
  serviceName: string;
  durationMin: number;
  price: number;
  discountPercent: number;
  finalPrice: number;
  membershipApplied: boolean;
  clientName: string;
  notes: string;
  canModify: boolean;
};

/** Mirrors `barberDoesService` from lib/availability (that module is server-only). */
export function barberDoesService(barber: Pick<CatalogBarber, "serviceIds">, serviceId: string) {
  return !barber.serviceIds.length || barber.serviceIds.includes(serviceId);
}

/** Mirrors `serviceInBranch` from lib/availability. */
export function serviceInBranch(service: Pick<CatalogService, "branchIds">, branchId: string) {
  return !service.branchIds.length || service.branchIds.includes(branchId);
}
