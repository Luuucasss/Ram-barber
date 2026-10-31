import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { Plan, Reward, Service } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { LoyaltyManager } from "@/components/admin/catalog/LoyaltyManager";
import { serialize, type PlanItem, type RewardItem } from "@/components/admin/catalog/types";

export const metadata: Metadata = { title: "Fidelidad" };
export const dynamic = "force-dynamic";

const SORT = { order: 1, name: 1 } as const;

export default async function FidelidadPage() {
  let data;
  try {
    await connectDB();
    const [settings, rewards, plans, reference] = await Promise.all([
      getSettings(),
      Reward.find().sort(SORT).lean(),
      Plan.find().sort(SORT).lean(),
      // Cheapest bookable service covered by plans: baseline for "price per cut" savings.
      Service.findOne({ active: true, includedInPlan: true }, { name: 1, price: 1 }).sort({ price: 1 }).lean(),
    ]);
    data = { settings, rewards, plans, reference };
  } catch (e) {
    return <LoadError title="Fidelidad" error={e} />;
  }
  return (
    <LoyaltyManager
      settings={data.settings}
      rewards={serialize<RewardItem[]>(data.rewards)}
      plans={serialize<PlanItem[]>(data.plans)}
      reference={data.reference ? { name: data.reference.name, price: data.reference.price } : null}
    />
  );
}
