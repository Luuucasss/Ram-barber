import { itemHandlers } from "../../branches/_crud";
import { planCrud } from "../_config";

const handlers = itemHandlers(planCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
