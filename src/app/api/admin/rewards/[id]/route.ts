import { itemHandlers } from "../../branches/_crud";
import { rewardCrud } from "../_config";

const handlers = itemHandlers(rewardCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
