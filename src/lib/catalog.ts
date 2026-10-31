import { Barber, Branch, Service } from "./models";
import { plain } from "./api";
import { getSettings } from "./settings";
import { nowInTz } from "./time";

const SORT = { order: 1, name: 1 } as const;

/** Everything the public site needs to render the booking flow. Requires an open DB connection. */
export async function getPublicCatalog() {
  const [settings, branches, services, barbers] = await Promise.all([
    getSettings(),
    Branch.find({ active: true }).sort(SORT).lean(),
    Service.find({ active: true }).sort(SORT).lean(),
    Barber.find({ active: true }, { name: 1, photoUrl: 1, bio: 1, branchId: 1, serviceIds: 1, schedule: 1, order: 1 })
      .sort(SORT)
      .lean(),
  ]);
  return plain({ settings, today: nowInTz(settings.timezone).date, branches, services, barbers });
}
export type PublicCatalog = Awaited<ReturnType<typeof getPublicCatalog>>;

/** Full catalog for admin screens, including inactive records. */
export async function getAdminCatalog() {
  const [settings, branches, services, barbers] = await Promise.all([
    getSettings(),
    Branch.find().sort(SORT).lean(),
    Service.find().sort(SORT).lean(),
    Barber.find().sort(SORT).lean(),
  ]);
  return plain({ settings, today: nowInTz(settings.timezone).date, branches, services, barbers });
}
export type AdminCatalog = Awaited<ReturnType<typeof getAdminCatalog>>;
