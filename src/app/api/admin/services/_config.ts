import { Booking, Branch, Service } from "@/lib/models";
import { serviceSchema } from "@/lib/validation";
import { assertAllExist, type CrudConfig } from "../branches/_crud";

export const serviceCrud: CrudConfig = {
  model: Service,
  label: "El servicio",
  autoOrder: true,
  parseCreate: (body) => serviceSchema.parse(body),
  parsePatch: (body) => serviceSchema.partial().parse(body),
  check: async (data) => {
    if (Array.isArray(data.branchIds)) {
      data.branchIds = await assertAllExist(Branch, data.branchIds as string[], "Alguna de las sucursales elegidas no existe.");
    }
    return data;
  },
  // Barbers' serviceIds are intentionally left as-is on hard delete: pulling the id could turn
  // a one-service list into [] which means "all services".
  isReferenced: async (id) => Boolean(await Booking.exists({ serviceId: id })),
};
