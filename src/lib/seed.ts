import { Barber, Branch, Booking, Client, RateLimit, Service, Settings, TimeOff } from "./models";
import { DEFAULT_SETTINGS } from "./settings";

const SERVICES = [
  { name: "Corte", price: 14000, durationMin: 30, order: 1, description: "Corte a tijera y/o máquina, lavado y peinado." },
  { name: "Corte + Barba", price: 18000, durationMin: 30, order: 2, description: "Corte completo + perfilado y arreglo de barba." },
  { name: "Corte + Cejas", price: 15000, durationMin: 30, order: 3, description: "Corte completo + perfilado de cejas." },
  { name: "Corte FULL", price: 20000, durationMin: 30, order: 4, description: "Corte + barba + cejas. La experiencia completa." },
];

const WORK_DAYS = [1, 2, 3, 4, 5, 6];
const SCHEDULE = WORK_DAYS.flatMap((day) => [
  { day, start: "09:30", end: "13:00" },
  { day, start: "14:30", end: "21:30" },
]);

/**
 * Loads the initial business data only into an empty database (idempotent).
 * Ensures indexes first so the double-booking guard exists before any booking.
 */
export async function seedIfEmpty() {
  await Promise.all([Booking, Client, RateLimit, Service, Barber, Branch, TimeOff].map((m) => m.syncIndexes()));

  const created: string[] = [];
  if (!(await Settings.exists({ _id: "main" }))) {
    await Settings.create({ _id: "main", ...DEFAULT_SETTINGS });
    created.push("configuración");
  }

  let branch = await Branch.findOne().lean();
  if (!branch) {
    const b = await Branch.create({ name: "Ram Hair Studio", address: "", order: 1 });
    branch = b.toObject();
    created.push("sucursal");
  }

  if ((await Service.countDocuments()) === 0) {
    await Service.insertMany(SERVICES.map((s) => ({ ...s, includedInPlan: true })));
    created.push(`${SERVICES.length} servicios`);
  }

  if ((await Barber.countDocuments()) === 0) {
    await Barber.create({ name: "Ram", branchId: branch._id, schedule: SCHEDULE, order: 1 });
    created.push("barbero");
  }

  return { created, alreadyInitialized: created.length === 0 };
}
