import { Client, Plan } from "@/lib/models";
import { planSchema } from "@/lib/validation";
import type { CrudConfig } from "../branches/_crud";

export const planCrud: CrudConfig = {
  model: Plan,
  label: "El plan",
  autoOrder: true,
  parseCreate: (body) => planSchema.parse(body),
  parsePatch: (body) => planSchema.partial().parse(body),
  // Keep plans that some client is (or was) subscribed to; just stop offering them.
  isReferenced: async (id) => Boolean(await Client.exists({ "membership.planId": id })),
};
