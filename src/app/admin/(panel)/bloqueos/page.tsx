import type { Metadata } from "next";
import { getAdminCatalog } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { TimeOff } from "@/lib/models";
import { countOverlappingBookings } from "@/app/api/admin/timeoffs/_config";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { TimeOffsManager } from "@/components/admin/catalog/TimeOffsManager";
import { serialize, type BarberItem, type BranchItem, type TimeOffItem } from "@/components/admin/catalog/types";

export const metadata: Metadata = { title: "Bloqueos" };
export const dynamic = "force-dynamic";

export default async function BloqueosPage() {
  let catalog;
  let items: TimeOffItem[];
  try {
    await connectDB();
    catalog = await getAdminCatalog();
    const today = catalog.today;
    const docs = await TimeOff.find().sort({ dateFrom: 1, start: 1, createdAt: 1 }).lean();
    items = await Promise.all(
      docs.map(async (d) => ({
        ...serialize<TimeOffItem>(d),
        overlappingBookings: d.dateTo >= today ? await countOverlappingBookings(d, today) : 0,
      })),
    );
  } catch (e) {
    return <LoadError title="Bloqueos" error={e} />;
  }
  return (
    <TimeOffsManager
      initial={items}
      today={catalog.today}
      branches={serialize<BranchItem[]>(catalog.branches)}
      barbers={serialize<BarberItem[]>(catalog.barbers)}
    />
  );
}
