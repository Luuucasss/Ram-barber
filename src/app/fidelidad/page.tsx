import type { Metadata } from "next";
import { Loyalty, type LoyaltyPreview } from "@/components/public/loyalty/Loyalty";
import { connectDB } from "@/lib/db";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";
import type { AppSettings } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fidelidad RAM",
  description: "Tu tarjeta de sellos de Ram Hair Studio: cada corte suma, y el último de la tarjeta trae regalo.",
};

async function loadSettings(): Promise<AppSettings> {
  try {
    await connectDB();
    return await getSettings();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default async function FidelidadPage() {
  const s = await loadSettings();
  const preview: LoyaltyPreview = {
    enabled: s.loyalty.enabled,
    cardSize: s.loyalty.cardSize,
    steps: s.loyalty.steps,
    membershipEnabled: s.membershipEnabled,
  };
  return <Loyalty whatsapp={s.whatsapp} preview={preview} />;
}
