import { randomInt } from "crypto";
import { z } from "zod";
import { ApiError, clientIp, ok, readJson, route } from "@/lib/api";
import { Client, Reward, type ClientDoc, type RewardDoc } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { zObjectId, zPhone } from "@/lib/validation";
import { loyaltyPayload } from "../_payload";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: zPhone,
  cycle: z.number().int().min(1),
  rewardId: zObjectId,
});

// No 0/O or 1/I: the code is read aloud and typed by staff.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function redemptionCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

const SOLD_OUT = () => new ApiError(409, "out_of_stock", "Ese regalo se agotó recién. Elegí otro.");

export const POST = route(async (req) => {
  await rateLimit(
    `pub-loyalty-redeem:${clientIp(req)}`,
    10,
    600,
    "Hiciste muchos intentos seguidos. Esperá un rato o escribinos por WhatsApp.",
  );
  const { phone, cycle, rewardId } = await readJson(req, bodySchema);

  const reward = await Reward.findOne({ _id: rewardId, active: true }).lean<RewardDoc>();
  if (!reward || (typeof reward.stock === "number" && reward.stock <= 0)) throw SOLD_OUT();

  const code = redemptionCode();

  // 1) Atomically claim the pending cycle: only one redemption per completed card.
  const claimed = await Client.findOneAndUpdate(
    { phone, "loyalty.pendingCycles": cycle, "loyalty.redemptions.cycle": { $ne: cycle } },
    {
      $pull: { "loyalty.pendingCycles": cycle },
      $push: {
        "loyalty.redemptions": {
          cycle,
          rewardId: reward._id,
          rewardName: reward.name,
          code,
          chosenAt: new Date(),
          deliveredAt: null,
        },
      },
    },
    { new: true },
  ).lean<ClientDoc>();

  if (!claimed) {
    const client = await Client.findOne({ phone }, { loyalty: 1 }).lean<ClientDoc>();
    if (!client) throw new ApiError(404, "not_found", "No encontramos una tarjeta con ese teléfono.");
    if (client.loyalty?.redemptions?.some((r) => r.cycle === cycle)) {
      throw new ApiError(409, "already_redeemed", "Ya elegiste tu regalo para esta tarjeta.");
    }
    throw new ApiError(409, "no_pending", "No tenés un regalo pendiente para esa tarjeta.");
  }

  // 2) Limited stock: decrement atomically; if it ran out meanwhile, give the cycle back.
  if (typeof reward.stock === "number") {
    const dec = await Reward.findOneAndUpdate(
      { _id: reward._id, active: true, stock: { $gt: 0 } },
      { $inc: { stock: -1 } },
      { new: true },
    ).lean();
    if (!dec) {
      await Client.updateOne(
        { phone },
        {
          $pull: { "loyalty.redemptions": { cycle, code } },
          $addToSet: { "loyalty.pendingCycles": cycle },
        },
      );
      throw SOLD_OUT();
    }
  }

  return ok({
    redemption: { cycle, rewardName: reward.name, code },
    ...(await loyaltyPayload(phone)),
  });
});
