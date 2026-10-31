import { Barber, Booking, Branch, Service, TimeOff } from "@/lib/models";
import { ApiError } from "@/lib/api";
import { dayName } from "@/lib/format";
import { barberSchema } from "@/lib/validation";
import { normalizeSchedule, type DayRange } from "@/components/admin/catalog/schedule-utils";
import { assertAllExist, type CrudConfig } from "../branches/_crud";

export const barberCrud: CrudConfig = {
  model: Barber,
  label: "El barbero",
  autoOrder: true,
  parseCreate: (body) => barberSchema.parse(body),
  parsePatch: (body) => barberSchema.partial().parse(body),
  check: async (data) => {
    if (typeof data.branchId === "string" && !(await Branch.exists({ _id: data.branchId }))) {
      throw new ApiError(400, "invalid_branch", "La sucursal elegida no existe.");
    }
    if (Array.isArray(data.serviceIds)) {
      data.serviceIds = await assertAllExist(Service, data.serviceIds as string[], "Alguno de los servicios elegidos no existe.");
    }
    if (Array.isArray(data.schedule)) {
      const { schedule, error } = normalizeSchedule(data.schedule as DayRange[]);
      if (error) throw new ApiError(400, "invalid_schedule", `${dayName(error.day)}: ${error.message}`);
      data.schedule = schedule;
    }
    return data;
  },
  isReferenced: async (id) => Boolean(await Booking.exists({ barberId: id })),
  onHardDelete: async (id) => {
    await TimeOff.deleteMany({ barberId: id });
  },
};
