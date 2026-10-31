import { Barber, Booking, Branch, TimeOff } from "@/lib/models";
import { branchSchema } from "@/lib/validation";
import type { CrudConfig } from "./_crud";

export const branchCrud: CrudConfig = {
  model: Branch,
  label: "La sucursal",
  autoOrder: true,
  parseCreate: (body) => branchSchema.parse(body),
  parsePatch: (body) => branchSchema.partial().parse(body),
  // A branch with booking history or barbers assigned is kept (deactivated) so nothing dangles.
  isReferenced: async (id) => Boolean((await Booking.exists({ branchId: id })) || (await Barber.exists({ branchId: id }))),
  onHardDelete: async (id) => {
    await TimeOff.deleteMany({ branchId: id, barberId: null });
  },
};
