import { Reward } from "@/lib/models";
import { rewardSchema } from "@/lib/validation";
import type { CrudConfig } from "../branches/_crud";

// Redemptions store the reward name, so rewards can always be hard-deleted.
export const rewardCrud: CrudConfig = {
  model: Reward,
  label: "El regalo",
  autoOrder: true,
  parseCreate: (body) => rewardSchema.parse(body),
  parsePatch: (body) => rewardSchema.partial().parse(body),
};
