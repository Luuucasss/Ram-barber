import { collectionHandlers } from "./_crud";
import { branchCrud } from "./_config";

export const dynamic = "force-dynamic";

const handlers = collectionHandlers(branchCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
