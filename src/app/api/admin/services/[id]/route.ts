import { itemHandlers } from "../../branches/_crud";
import { serviceCrud } from "../_config";

const handlers = itemHandlers(serviceCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
