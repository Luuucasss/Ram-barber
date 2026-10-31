import { collectionHandlers } from "../branches/_crud";
import { barberCrud } from "./_config";

export const dynamic = "force-dynamic";

const handlers = collectionHandlers(barberCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
