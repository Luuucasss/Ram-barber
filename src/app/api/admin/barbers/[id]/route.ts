import { itemHandlers } from "../../branches/_crud";
import { barberCrud } from "../_config";

const handlers = itemHandlers(barberCrud);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
