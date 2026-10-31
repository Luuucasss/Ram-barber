import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, ok, plain, readJson, route } from "@/lib/api";
import { Service } from "@/lib/models";
import { zObjectId } from "@/lib/validation";

const reorderSchema = z.object({ ids: z.array(zObjectId).min(1).max(500) });

/** POST { ids } → sets order = position (1-based) for every listed service. Returns the sorted list. */
export const POST = route(
  async (req) => {
    const { ids } = await readJson(req, reorderSchema);
    if (new Set(ids).size !== ids.length) throw new ApiError(400, "invalid_input", "La lista tiene servicios repetidos.");
    await Service.bulkWrite(
      ids.map((id, i) => ({
        updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { order: i + 1 } } },
      })),
    );
    const items = await Service.find().sort({ order: 1, name: 1 }).lean();
    return ok(plain({ items }));
  },
  { admin: true },
);
