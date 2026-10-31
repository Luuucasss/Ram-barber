import { ok, route } from "@/lib/api";
import { getPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await getPublicCatalog()));
