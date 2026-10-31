import { z } from "zod";
import { clientIp, ok, readJson, route } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { zPhone } from "@/lib/validation";
import { loyaltyPayload } from "./_payload";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ phone: zPhone });

export const POST = route(async (req) => {
  await rateLimit(
    `pub-loyalty:${clientIp(req)}`,
    15,
    600,
    "Hiciste muchas consultas seguidas. Esperá un rato e intentá de nuevo, o escribinos por WhatsApp.",
  );
  const { phone } = await readJson(req, bodySchema);
  return ok(await loyaltyPayload(phone));
});
