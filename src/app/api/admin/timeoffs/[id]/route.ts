import { itemHandlers } from "../../branches/_crud";
import { timeOffCrud } from "../_config";

const handlers = itemHandlers(timeOffCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
