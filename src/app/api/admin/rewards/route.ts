import { collectionHandlers } from "../branches/_crud";
import { rewardCrud } from "./_config";

export const dynamic = "force-dynamic";

const handlers = collectionHandlers(rewardCrud);
export const GET = handlers.GET;
export const POST = handlers.POST;
