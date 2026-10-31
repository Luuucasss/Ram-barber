/** JSON shapes of catalog records as they reach the browser (ObjectIds → strings). */

export type ScheduleRange = { day: number; start: string; end: string };

export type BranchItem = {
  _id: string;
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
  active: boolean;
  order: number;
};

export type ServiceItem = {
  _id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  includedInPlan: boolean;
  branchIds: string[];
  active: boolean;
  order: number;
};

export type BarberItem = {
  _id: string;
  name: string;
  photoUrl: string;
  bio: string;
  branchId: string;
  serviceIds: string[];
  schedule: ScheduleRange[];
  active: boolean;
  order: number;
};

export type TimeOffItem = {
  _id: string;
  branchId: string | null;
  barberId: string | null;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  start: string;
  end: string;
  reason: string;
  overlappingBookings?: number;
};

export type RewardItem = {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  stock: number | null;
  active: boolean;
  order: number;
};

export type PlanItem = {
  _id: string;
  name: string;
  cuts: number;
  price: number;
  description: string;
  active: boolean;
  order: number;
};

export type DeleteResult<T> = { result: "deleted" } | { result: "deactivated"; item: T };

/** Server → client hand-off: lean Mongo docs become plain JSON (ids as strings). */
export function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
