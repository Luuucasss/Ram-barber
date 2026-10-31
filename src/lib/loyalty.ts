import type { ClientDoc } from "./models";
import type { AppSettings } from "./validation";

type LoyaltyClient = Pick<ClientDoc, "loyalty" | "membership" | "lastVisitAt">;

export function isMemberActive(client: Pick<ClientDoc, "membership"> | null | undefined, onDate: string): boolean {
  const m = client?.membership;
  return Boolean(m?.active && m.cutsRemaining > 0 && (!m.validUntil || m.validUntil >= onDate));
}

export function stepFor(settings: AppSettings, position: number) {
  return settings.loyalty.steps.find((s) => s.position === position) ?? null;
}

/** Price the client will pay for a service on a given date (membership > loyalty discount > full). */
export function priceFor(
  client: LoyaltyClient | null,
  service: { price: number; includedInPlan: boolean },
  date: string,
  settings: AppSettings,
) {
  if (client && settings.membershipEnabled && service.includedInPlan && isMemberActive(client, date)) {
    return { discountPercent: 100, finalPrice: 0, membershipApplied: true };
  }
  if (client && settings.loyalty.enabled) {
    const step = stepFor(settings, (client.loyalty?.stamps ?? 0) + 1);
    if (step?.percent) {
      return {
        discountPercent: step.percent,
        finalPrice: Math.round(service.price * (1 - step.percent / 100)),
        membershipApplied: false,
      };
    }
  }
  return { discountPercent: 0, finalPrice: service.price, membershipApplied: false };
}

export type LoyaltyView = {
  enabled: boolean;
  cardSize: number;
  steps: AppSettings["loyalty"]["steps"];
  cycle: number;
  stamps: number;
  totalCuts: number;
  next: { position: number; percent: number; gift: boolean };
  pendingCycles: number[];
  redemptions: { cycle: number; rewardName: string; code: string; chosenAt: string; deliveredAt: string | null }[];
  member: { planName: string; cutsRemaining: number; cutsPerPeriod: number; validUntil: string } | null;
  lastVisitAt: string | null;
};

export function loyaltyView(client: LoyaltyClient | null, settings: AppSettings, today: string): LoyaltyView {
  const l = client?.loyalty;
  const stamps = l?.stamps ?? 0;
  const position = stamps + 1;
  const step = stepFor(settings, position);
  return {
    enabled: settings.loyalty.enabled,
    cardSize: settings.loyalty.cardSize,
    steps: settings.loyalty.steps,
    cycle: l?.cycle ?? 1,
    stamps,
    totalCuts: l?.totalCuts ?? 0,
    next: { position, percent: step?.percent ?? 0, gift: step?.gift ?? false },
    pendingCycles: [...(l?.pendingCycles ?? [])],
    redemptions: (l?.redemptions ?? []).map((r) => ({
      cycle: r.cycle,
      rewardName: r.rewardName,
      code: r.code,
      chosenAt: new Date(r.chosenAt ?? Date.now()).toISOString(),
      deliveredAt: r.deliveredAt ? new Date(r.deliveredAt).toISOString() : null,
    })),
    member:
      client && settings.membershipEnabled && isMemberActive(client, today)
        ? {
            planName: client.membership.planName,
            cutsRemaining: client.membership.cutsRemaining,
            cutsPerPeriod: client.membership.cutsPerPeriod,
            validUntil: client.membership.validUntil,
          }
        : null,
    lastVisitAt: client?.lastVisitAt ? new Date(client.lastVisitAt).toISOString() : null,
  };
}
