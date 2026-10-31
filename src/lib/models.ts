import mongoose, { Schema, type Model, type Types } from "mongoose";

const { ObjectId } = Schema.Types;

// Built through an untyped constructor: letting tsc infer Mongoose schema generics exhausts its memory.
// The explicit interfaces below are the source of truth for document shapes.
const SchemaCtor = Schema as unknown as new (definition: object, options?: object) => Schema;
function makeSchema(definition: object, options?: object): Schema {
  return new SchemaCtor(definition, options);
}

const RangeSchema = makeSchema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const BranchSchema = makeSchema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    mapsUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ServiceSchema = makeSchema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    durationMin: { type: Number, required: true, min: 5, max: 480 },
    price: { type: Number, required: true, min: 0 },
    includedInPlan: { type: Boolean, default: true },
    branchIds: { type: [ObjectId], default: [] },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const BarberSchema = makeSchema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    serviceIds: { type: [ObjectId], default: [] },
    schedule: { type: [RangeSchema], default: [] },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const TimeOffSchema = makeSchema(
  {
    branchId: { type: ObjectId, default: null },
    barberId: { type: ObjectId, default: null },
    dateFrom: { type: String, required: true },
    dateTo: { type: String, required: true },
    allDay: { type: Boolean, default: true },
    start: { type: String, default: "" },
    end: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { timestamps: true },
);
TimeOffSchema.index({ dateFrom: 1, dateTo: 1 });

const RedemptionSchema = makeSchema(
  {
    cycle: { type: Number, required: true },
    rewardId: { type: ObjectId, required: true },
    rewardName: { type: String, required: true },
    code: { type: String, required: true },
    chosenAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
  },
  { _id: true },
);

const ClientSchema = makeSchema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    notes: { type: String, default: "" },
    stats: {
      bookings: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      noShows: { type: Number, default: 0 },
    },
    lastVisitAt: { type: Date, default: null },
    loyalty: {
      cycle: { type: Number, default: 1 },
      stamps: { type: Number, default: 0 },
      totalCuts: { type: Number, default: 0 },
      pendingCycles: { type: [Number], default: [] },
      redemptions: { type: [RedemptionSchema], default: [] },
    },
    membership: {
      active: { type: Boolean, default: false },
      planId: { type: ObjectId, default: null },
      planName: { type: String, default: "" },
      cutsPerPeriod: { type: Number, default: 0 },
      cutsRemaining: { type: Number, default: 0 },
      validUntil: { type: String, default: "" },
    },
  },
  { timestamps: true },
);
ClientSchema.index({ name: 1 });

const HistorySchema = makeSchema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, required: true },
    by: { type: String, default: "" },
    detail: { type: String, default: "" },
  },
  { _id: false },
);

export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const BookingSchema = makeSchema(
  {
    token: { type: String, required: true, unique: true },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    barberId: { type: ObjectId, ref: "Barber", required: true },
    serviceId: { type: ObjectId, ref: "Service", required: true },
    clientId: { type: ObjectId, ref: "Client", required: true },
    branchName: { type: String, default: "" },
    barberName: { type: String, default: "" },
    serviceName: { type: String, default: "" },
    durationMin: { type: Number, required: true },
    price: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    includedInPlan: { type: Boolean, default: false },
    membershipApplied: { type: Boolean, default: false },
    loyaltyApplied: { type: Boolean, default: false },
    clientName: { type: String, default: "" },
    clientPhone: { type: String, required: true },
    notes: { type: String, default: "" },
    date: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "confirmed" },
    active: { type: Boolean, default: true },
    slotKeys: { type: [String], default: [] },
    source: { type: String, enum: ["web", "admin"], default: "web" },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: "" },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true },
);
// Atomic double-booking guard: no two active bookings can share a 5-minute barber slot key.
BookingSchema.index({ slotKeys: 1 }, { unique: true, partialFilterExpression: { active: true } });
BookingSchema.index({ barberId: 1, date: 1 });
BookingSchema.index({ date: 1, start: 1 });
BookingSchema.index({ clientPhone: 1, date: -1 });
BookingSchema.index({ clientId: 1, date: -1 });

const RewardSchema = makeSchema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    stock: { type: Number, default: null },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const PlanSchema = makeSchema(
  {
    name: { type: String, required: true, trim: true },
    cuts: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const SettingsSchema = makeSchema({ _id: { type: String, default: "main" } }, { strict: false, timestamps: true });

const RateLimitSchema = makeSchema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type Id = Types.ObjectId;
type Timestamps = { createdAt: Date; updatedAt: Date };

export interface ScheduleRange {
  day: number;
  start: string;
  end: string;
}

export interface BranchDoc extends Timestamps {
  _id: Id;
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
  active: boolean;
  order: number;
}

export interface ServiceDoc extends Timestamps {
  _id: Id;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  includedInPlan: boolean;
  branchIds: Id[];
  active: boolean;
  order: number;
}

export interface BarberDoc extends Timestamps {
  _id: Id;
  name: string;
  photoUrl: string;
  bio: string;
  branchId: Id;
  serviceIds: Id[];
  schedule: ScheduleRange[];
  active: boolean;
  order: number;
}

export interface TimeOffDoc extends Timestamps {
  _id: Id;
  branchId: Id | null;
  barberId: Id | null;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  start: string;
  end: string;
  reason: string;
}

export interface Redemption {
  _id: Id;
  cycle: number;
  rewardId: Id;
  rewardName: string;
  code: string;
  chosenAt: Date;
  deliveredAt: Date | null;
}

export interface ClientDoc extends Timestamps {
  _id: Id;
  phone: string;
  name: string;
  notes: string;
  stats: { bookings: number; completed: number; cancelled: number; noShows: number };
  lastVisitAt: Date | null;
  loyalty: {
    cycle: number;
    stamps: number;
    totalCuts: number;
    pendingCycles: number[];
    redemptions: Redemption[];
  };
  membership: {
    active: boolean;
    planId: Id | null;
    planName: string;
    cutsPerPeriod: number;
    cutsRemaining: number;
    validUntil: string;
  };
}

export interface BookingHistory {
  at: Date;
  action: string;
  by: string;
  detail: string;
}

export interface BookingDoc extends Timestamps {
  _id: Id;
  token: string;
  branchId: Id;
  barberId: Id;
  serviceId: Id;
  clientId: Id;
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
  slotKeys: string[];
  source: "web" | "admin";
  cancelledAt: Date | null;
  cancelledBy: string;
  history: BookingHistory[];
}

export interface RewardDoc extends Timestamps {
  _id: Id;
  name: string;
  description: string;
  imageUrl: string;
  stock: number | null;
  active: boolean;
  order: number;
}

export interface PlanDoc extends Timestamps {
  _id: Id;
  name: string;
  cuts: number;
  price: number;
  description: string;
  active: boolean;
  order: number;
}

interface SettingsDoc {
  _id: string;
  [key: string]: unknown;
}

interface RateLimitDoc {
  _id: Id;
  key: string;
  count: number;
  expiresAt: Date;
}

// Reuse compiled models across hot reloads / warm serverless invocations.
const m = mongoose.models;
export const Branch: Model<BranchDoc> = m.Branch ?? mongoose.model<BranchDoc>("Branch", BranchSchema);
export const Service: Model<ServiceDoc> = m.Service ?? mongoose.model<ServiceDoc>("Service", ServiceSchema);
export const Barber: Model<BarberDoc> = m.Barber ?? mongoose.model<BarberDoc>("Barber", BarberSchema);
export const TimeOff: Model<TimeOffDoc> = m.TimeOff ?? mongoose.model<TimeOffDoc>("TimeOff", TimeOffSchema);
export const Client: Model<ClientDoc> = m.Client ?? mongoose.model<ClientDoc>("Client", ClientSchema);
export const Booking: Model<BookingDoc> = m.Booking ?? mongoose.model<BookingDoc>("Booking", BookingSchema);
export const Reward: Model<RewardDoc> = m.Reward ?? mongoose.model<RewardDoc>("Reward", RewardSchema);
export const Plan: Model<PlanDoc> = m.Plan ?? mongoose.model<PlanDoc>("Plan", PlanSchema);
export const Settings: Model<SettingsDoc> = m.Settings ?? mongoose.model<SettingsDoc>("Settings", SettingsSchema);
export const RateLimit: Model<RateLimitDoc> =
  m.RateLimit ?? mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);
