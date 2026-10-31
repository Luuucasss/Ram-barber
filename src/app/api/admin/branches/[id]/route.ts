import { itemHandlers } from "../_crud";
import { branchCrud } from "../_config";

const handlers = itemHandlers(branchCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
