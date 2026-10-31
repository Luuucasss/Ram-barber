import type { AdminBooking } from "@/components/admin/bookings/types";

export interface ClientListItem {
  _id: string;
  name: string;
  phone: string;
  stats: { bookings: number; completed: number; cancelled: number; noShows: number };
  lastVisitAt: string | null;
  createdAt: string;
  stamps: number;
  pendingGifts: number;
  member: boolean;
  planName: string;
}

export interface ClientListResponse {
  items: ClientListItem[];
  total: number;
  page: number;
  pageSize: number;
  cardSize: number;
  loyaltyEnabled: boolean;
}

export interface Redemption {
  _id: string;
  cycle: number;
  rewardId: string;
  rewardName: string;
  code: string;
  chosenAt: string;
  deliveredAt: string | null;
}

export interface ClientFull {
  _id: string;
  phone: string;
  name: string;
  notes: string;
  stats: { bookings: number; completed: number; cancelled: number; noShows: number };
  lastVisitAt: string | null;
  createdAt: string;
  loyalty: { cycle: number; stamps: number; totalCuts: number; pendingCycles: number[]; redemptions: Redemption[] };
  membership: {
    active: boolean;
    planId: string | null;
    planName: string;
    cutsPerPeriod: number;
    cutsRemaining: number;
    validUntil: string;
  };
}

export interface PlanItem {
  _id: string;
  name: string;
  cuts: number;
  price: number;
  description: string;
}

export type LoyaltyStep = { position: number; percent: number; gift: boolean };

export interface ClientDetailData {
  client: ClientFull;
  bookings: AdminBooking[];
  plans: PlanItem[];
  loyalty: {
    enabled: boolean;
    cardSize: number;
    steps: LoyaltyStep[];
    cycle: number;
    stamps: number;
    totalCuts: number;
    next: { position: number; percent: number; gift: boolean };
    pendingCycles: number[];
    member: { planName: string; cutsRemaining: number; cutsPerPeriod: number; validUntil: string } | null;
    lastVisitAt: string | null;
  };
  today: string;
  settings: {
    loyalty: { enabled: boolean; cardSize: number; steps: LoyaltyStep[] };
    membershipEnabled: boolean;
    currency: string;
    timezone: string;
    businessName: string;
  };
}
