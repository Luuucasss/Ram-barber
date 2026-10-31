import { z } from "zod";
import { ApiError, ok, route } from "@/lib/api";
import { parseBody } from "@/app/api/admin/bookings/_shared";
import { Client } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { zObjectId } from "@/lib/validation";
import { clientDetail, clientIdFrom, type ClientParams } from "../../_shared";

export const dynamic = "force-dynamic";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("adjust"), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ action: z.literal("deliver"), redemptionId: zObjectId }),
]);

/**
 * Manual loyalty operations. Stamp adjustments mirror the rules in `lib/bookings.ts`
 * (applyCompletion / revertCompletion) so a manual stamp behaves exactly like a completed cut.
 */
export const POST = route<ClientParams>(
  async (req, ctx) => {
    const id = await clientIdFrom(ctx);
    const input = await parseBody(req, body);
    const client = await Client.findById(id);
    if (!client) throw new ApiError(404, "not_found", "No encontramos el cliente.");

    if (input.action === "deliver") {
      const r = client.loyalty.redemptions.find((x) => String(x._id) === input.redemptionId);
      if (!r) throw new ApiError(404, "not_found", "No encontramos ese canje.");
      if (!r.deliveredAt) {
        r.deliveredAt = new Date();
        await client.save();
      }
      return ok(await clientDetail(id));
    }

    const settings = await getSettings();
    const l = client.loyalty;
    if (input.delta === 1) {
      l.stamps += 1;
      l.totalCuts += 1;
      if (l.stamps >= settings.loyalty.cardSize) {
        if (settings.loyalty.steps.some((s) => s.gift)) l.pendingCycles.push(l.cycle);
        l.cycle += 1;
        l.stamps = 0;
      }
    } else if (l.stamps > 0) {
      l.stamps -= 1;
      l.totalCuts = Math.max(0, l.totalCuts - 1);
    } else if (l.cycle > 1) {
      const prevCycle = l.cycle - 1;
      if (l.redemptions.some((r) => r.cycle === prevCycle)) {
        throw new ApiError(
          409,
          "already_redeemed",
          "El regalo de la tarjeta anterior ya fue canjeado; no se puede volver atrás.",
        );
      }
      l.pendingCycles = l.pendingCycles.filter((c) => c !== prevCycle);
      l.cycle = prevCycle;
      l.stamps = settings.loyalty.cardSize - 1;
      l.totalCuts = Math.max(0, l.totalCuts - 1);
    } else {
      throw new ApiError(409, "no_stamps", "La tarjeta no tiene sellos para descontar.");
    }

    client.markModified("loyalty");
    await client.save();
    return ok(await clientDetail(id));
  },
  { admin: true },
);
