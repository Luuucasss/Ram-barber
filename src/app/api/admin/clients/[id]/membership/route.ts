import { z } from "zod";
import { ApiError, ok, route } from "@/lib/api";
import { parseBody } from "@/app/api/admin/bookings/_shared";
import { Client, Plan } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { addDays, nowInTz } from "@/lib/time";
import { zDate, zObjectId } from "@/lib/validation";
import { clientDetail, clientIdFrom, type ClientParams } from "../../_shared";

export const dynamic = "force-dynamic";

const body = z
  .object({
    active: z.boolean(),
    planId: zObjectId.optional(),
    cutsRemaining: z.number().int().min(0).max(999).optional(),
    validUntil: z.union([z.literal(""), zDate]).optional(),
  })
  .strict();

/**
 * Assign / renew / edit / deactivate a client's membership.
 * Passing `planId` (re)assigns the plan: cutsRemaining defaults to plan.cuts and validUntil to today + 30 days.
 */
export const PUT = route<ClientParams>(
  async (req, ctx) => {
    const id = await clientIdFrom(ctx);
    const input = await parseBody(req, body);
    const client = await Client.findById(id, { membership: 1 }).lean();
    if (!client) throw new ApiError(404, "not_found", "No encontramos el cliente.");

    const set: Record<string, unknown> = { "membership.active": input.active };

    if (input.active) {
      if (input.planId) {
        const plan = await Plan.findById(input.planId).lean();
        if (!plan) throw new ApiError(404, "plan_not_found", "Ese plan no existe.");
        const settings = await getSettings();
        const today = nowInTz(settings.timezone).date;
        set["membership.planId"] = plan._id;
        set["membership.planName"] = plan.name;
        set["membership.cutsPerPeriod"] = plan.cuts;
        set["membership.cutsRemaining"] = input.cutsRemaining ?? plan.cuts;
        set["membership.validUntil"] = input.validUntil || addDays(today, 30);
      } else {
        if (!client.membership?.planId) {
          throw new ApiError(400, "plan_required", "Elegí un plan para activar la membresía.");
        }
        if (input.cutsRemaining !== undefined) set["membership.cutsRemaining"] = input.cutsRemaining;
        if (input.validUntil !== undefined) set["membership.validUntil"] = input.validUntil;
      }
    }

    await Client.updateOne({ _id: id }, { $set: set });
    return ok(await clientDetail(id));
  },
  { admin: true },
);
