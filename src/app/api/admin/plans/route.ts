import { collectionHandlers } from "../branches/_crud";
import { planCrud } from "./_config";

export const dynamic = "force-dynamic";

const handlers = collectionHandlers(planCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
