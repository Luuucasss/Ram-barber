import type { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";
import { plain, readJson } from "@/lib/api";

/** Like `readQuery`, but typed with the schema's *output* (so `.default()` values are non-optional). */
export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.output<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

/** Like `readJson`, but typed with the schema's *output*. */
export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  return schema.parse(await readJson(req, z.unknown()));
}

/** Admin-facing JSON shape of a booking (ObjectIds → strings, Dates → ISO). Internal lock keys are dropped. */
export function serializeBooking(b: object) {
  const out = plain(b) as Record<string, unknown>;
  delete out.slotKeys;
  delete out.__v;
  return out;
}

/** Escapes user input for safe use inside a MongoDB $regex. */
export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
