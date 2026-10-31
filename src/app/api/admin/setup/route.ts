import { ok, route } from "@/lib/api";
import { seedIfEmpty } from "@/lib/seed";

export const POST = route(async () => ok(await seedIfEmpty()), { admin: true });
