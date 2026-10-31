import { loyaltyView, type LoyaltyView } from "@/lib/loyalty";
import { Client, Plan, Reward, type ClientDoc, type PlanDoc, type RewardDoc } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { nowInTz } from "@/lib/time";

export type PublicReward = { id: string; name: string; description: string; imageUrl: string; stock: number | null };
export type PublicPlan = { id: string; name: string; cuts: number; price: number; description: string; pricePerCut: number };

export type LoyaltyPayload = {
  exists: boolean;
  firstName: string;
  loyalty: LoyaltyView;
  rewards: PublicReward[];
  plans: PublicPlan[];
  membershipEnabled: boolean;
  whatsapp: string;
  timezone: string;
  currency: string;
};

/** Loyalty card + redeemable rewards + plans for a phone. The client may not exist yet. */
export async function loyaltyPayload(phone: string): Promise<LoyaltyPayload> {
  const settings = await getSettings();
  const today = nowInTz(settings.timezone).date;
  const [client, rewards, plans] = await Promise.all([
    Client.findOne({ phone }, { name: 1, loyalty: 1, membership: 1, lastVisitAt: 1 }).lean<ClientDoc>(),
    // `stock: null` also matches documents without the field (= unlimited).
    Reward.find({ active: true, $or: [{ stock: null }, { stock: { $gt: 0 } }] })
      .sort({ order: 1, name: 1 })
      .lean<RewardDoc[]>(),
    settings.membershipEnabled ? Plan.find({ active: true }).lean<PlanDoc[]>() : Promise.resolve([] as PlanDoc[]),
  ]);

  return {
    exists: Boolean(client),
    firstName: (client?.name ?? "").trim().split(/\s+/)[0] ?? "",
    loyalty: loyaltyView(client, settings, today),
    rewards: rewards.map((r) => ({
      id: String(r._id),
      name: r.name,
      description: r.description ?? "",
      imageUrl: r.imageUrl ?? "",
      stock: typeof r.stock === "number" ? r.stock : null,
    })),
    plans: plans
      .map((p) => ({
        id: String(p._id),
        name: p.name,
        cuts: p.cuts,
        price: p.price,
        description: p.description ?? "",
        pricePerCut: Math.round(p.price / Math.max(1, p.cuts)),
      }))
      .sort((a, b) => a.pricePerCut - b.pricePerCut || a.price - b.price),
    membershipEnabled: settings.membershipEnabled,
    whatsapp: settings.whatsapp,
    timezone: settings.timezone,
    currency: settings.currency,
  };
}
