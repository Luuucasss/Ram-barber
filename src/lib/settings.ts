import { Settings } from "./models";
import { settingsSchema, type AppSettings } from "./validation";

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: "Ram Hair Studio",
  tagline: "Barbería & estilo",
  logoUrl: "/logo.jpg",
  whatsapp: "5493513704782",
  instagram: "",
  address: "",
  timezone: "America/Argentina/Cordoba",
  currency: "ARS",
  slotIntervalMin: 30,
  bookingWindowDays: 14,
  minNoticeMin: 60,
  cancelLimitHours: 2,
  announcement: "",
  loyalty: {
    enabled: true,
    cardSize: 8,
    steps: [
      { position: 2, percent: 10, gift: false },
      { position: 4, percent: 10, gift: false },
      { position: 6, percent: 10, gift: false },
      { position: 8, percent: 50, gift: true },
    ],
  },
  membershipEnabled: true,
};

/** Requires an open DB connection. Missing fields fall back to defaults. */
export async function getSettings(): Promise<AppSettings> {
  const doc = (await Settings.findById("main").lean()) as Record<string, unknown> | null;
  if (!doc) return DEFAULT_SETTINGS;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...pick(doc),
    loyalty: { ...DEFAULT_SETTINGS.loyalty, ...((doc.loyalty as object) ?? {}) },
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(input: AppSettings): Promise<AppSettings> {
  const data = settingsSchema.parse(input);
  await Settings.updateOne({ _id: "main" }, { $set: data }, { upsert: true });
  return data;
}

function pick(doc: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in doc && doc[k] !== undefined) out[k] = doc[k];
  return out;
}
