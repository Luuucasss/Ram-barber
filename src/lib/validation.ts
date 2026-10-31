import { z } from "zod";
import { Types } from "mongoose";
import { normalizePhone } from "./phone";

export const zObjectId = z.string().refine((v) => Types.ObjectId.isValid(v), "ID inválido");
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");
export const zTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)")
  .refine((t) => Number(t.slice(3)) % 5 === 0, "Los horarios van de 5 en 5 minutos");
export const zPhone = z
  .string()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Código de área + número, sin 0 y sin 15." });
      return z.NEVER;
    }
    return p;
  });
export const zUrlOrEmpty = z.union([z.literal(""), z.string().url().max(2000)]);

export const rangeSchema = z
  .object({ day: z.number().int().min(0).max(6), start: zTime, end: zTime })
  .refine((r) => r.start < r.end, "La hora de inicio debe ser anterior a la de fin");

export const branchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).default(""),
  mapsUrl: zUrlOrEmpty.default(""),
  phone: z.string().trim().max(40).default(""),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).default(""),
  durationMin: z.number().int().min(5).max(480).refine((n) => n % 5 === 0, "Múltiplo de 5 minutos"),
  price: z.number().min(0),
  includedInPlan: z.boolean().default(true),
  branchIds: z.array(zObjectId).default([]),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const barberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  photoUrl: zUrlOrEmpty.default(""),
  bio: z.string().trim().max(300).default(""),
  branchId: zObjectId,
  serviceIds: z.array(zObjectId).default([]),
  schedule: z.array(rangeSchema).default([]),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const timeOffSchema = z
  .object({
    branchId: zObjectId.nullable().default(null),
    barberId: zObjectId.nullable().default(null),
    dateFrom: zDate,
    dateTo: zDate,
    allDay: z.boolean().default(true),
    start: z.union([z.literal(""), zTime]).default(""),
    end: z.union([z.literal(""), zTime]).default(""),
    reason: z.string().trim().max(200).default(""),
  })
  .refine((t) => t.dateFrom <= t.dateTo, "La fecha 'desde' debe ser anterior a 'hasta'")
  .refine((t) => t.allDay || (t.start && t.end && t.start < t.end), "Indicá un rango horario válido");

export const rewardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  imageUrl: zUrlOrEmpty.default(""),
  stock: z.number().int().min(0).nullable().default(null),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const planSchema = z.object({
  name: z.string().trim().min(1).max(80),
  cuts: z.number().int().min(1).max(60),
  price: z.number().min(0),
  description: z.string().trim().max(300).default(""),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const loyaltyStepSchema = z.object({
  position: z.number().int().min(1).max(30),
  percent: z.number().int().min(0).max(100),
  gift: z.boolean().default(false),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(100),
  logoUrl: z.string().trim().max(2000),
  whatsapp: z.string().trim().max(20),
  instagram: z.string().trim().max(60),
  address: z.string().trim().max(200),
  timezone: z.string().trim().min(1),
  currency: z.string().trim().length(3),
  slotIntervalMin: z.number().int().min(5).max(120).refine((n) => n % 5 === 0, "Múltiplo de 5"),
  bookingWindowDays: z.number().int().min(1).max(90),
  minNoticeMin: z.number().int().min(0).max(7 * 24 * 60),
  cancelLimitHours: z.number().min(0).max(168),
  announcement: z.string().trim().max(300),
  loyalty: z.object({
    enabled: z.boolean(),
    cardSize: z.number().int().min(2).max(30),
    steps: z.array(loyaltyStepSchema).max(30),
  }),
  membershipEnabled: z.boolean(),
});
export type AppSettings = z.infer<typeof settingsSchema>;
