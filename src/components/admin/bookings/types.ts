/** JSON shapes returned by the admin booking/agenda/client APIs (ids as strings, dates as ISO strings). */

export const STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmado",
  completed: "Asistió",
  cancelled: "Cancelado",
  no_show: "No vino",
};

export type BookingHistoryEntry = { at: string; action: string; by: string; detail: string };

export interface AdminBooking {
  _id: string;
  token: string;
  branchId: string;
  barberId: string;
  serviceId: string;
  clientId: string;
  branchName: string;
  barberName: string;
  serviceName: string;
  durationMin: number;
  price: number;
  discountPercent: number;
  finalPrice: number;
  includedInPlan: boolean;
  membershipApplied: boolean;
  loyaltyApplied: boolean;
  clientName: string;
  clientPhone: string;
  notes: string;
  date: string;
  start: string;
  end: string;
  status: BookingStatus;
  active: boolean;
  source: "web" | "admin";
  cancelledAt: string | null;
  cancelledBy: string;
  history: BookingHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ScheduleRange = { day: number; start: string; end: string };

export interface AgendaBarber {
  _id: string;
  name: string;
  photoUrl: string;
  branchId: string;
  schedule: ScheduleRange[];
  active: boolean;
  order: number;
}

export interface AgendaTimeOff {
  _id: string;
  branchId: string | null;
  barberId: string | null;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  start: string;
  end: string;
  reason: string;
}

export interface AgendaData {
  date: string;
  today: string;
  barbers: AgendaBarber[];
  bookings: AdminBooking[];
  timeOffs: AgendaTimeOff[];
  settings: { timezone: string; currency: string };
}

export interface BookingClientSummary {
  _id: string;
  name: string;
  phone: string;
  notes: string;
  stats: { bookings: number; completed: number; cancelled: number; noShows: number };
  lastVisitAt: string | null;
  loyalty: { enabled: boolean; stamps: number; cycle: number; cardSize: number; pendingGifts: number };
  member: { planName: string; cutsRemaining: number; validUntil: string } | null;
}

export type Slot = { time: string; barberIds: string[] };

export const HISTORY_LABEL: Record<string, string> = {
  created: "Turno creado",
  rescheduled: "Reprogramado",
  notes: "Notas editadas",
  "status:confirmed": "Restaurado",
  "status:completed": "Marcado asistió",
  "status:cancelled": "Cancelado",
  "status:no_show": "Marcado no vino",
};

export const BY_LABEL: Record<string, string> = { admin: "panel", client: "cliente" };
