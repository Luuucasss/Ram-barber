import { z } from "zod";
import { ApiError, ok, route } from "@/lib/api";
import { parseBody } from "@/app/api/admin/bookings/_shared";
import { Client } from "@/lib/models";
import { clientDetail, clientIdFrom, type ClientParams } from "../_shared";

export const dynamic = "force-dynamic";

export const GET = route<ClientParams>(async (_req, ctx) => ok(await clientDetail(await clientIdFrom(ctx))), {
  admin: true,
});

const patchBody = z
  .object({
    name: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((b) => b.name !== undefined || b.notes !== undefined, "Nada para actualizar");

export const PATCH = route<ClientParams>(
  async (req, ctx) => {
    const id = await clientIdFrom(ctx);
    const body = await parseBody(req, patchBody);
    const set: Record<string, string> = {};
    if (body.name !== undefined) set.name = body.name;
    if (body.notes !== undefined) set.notes = body.notes;
    const res = await Client.updateOne({ _id: id }, { $set: set });
    if (!res.matchedCount) throw new ApiError(404, "not_found", "No encontramos el cliente.");
    return ok(await clientDetail(id));
  },
  { admin: true },
);
