import { collectionHandlers } from "../branches/_crud";
import { serviceCrud } from "./_config";

export const dynamic = "force-dynamic";

const handlers = collectionHandlers(serviceCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
