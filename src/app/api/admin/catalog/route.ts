import { ok, route } from "@/lib/api";
import { getAdminCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await getAdminCatalog()), { admin: true });
