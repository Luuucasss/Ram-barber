import { collectionHandlers } from "../branches/_crud";
import { timeOffCrud } from "./_config";

export const dynamic = "force-dynamic";

/** GET → { items (with overlappingBookings), today }. POST → { item, overlappingBookings }. */
const handlers = collectionHandlers(timeOffCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
