import type { Metadata } from "next";
import { getAdminCatalog } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { BarbersManager } from "@/components/admin/catalog/BarbersManager";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { serialize, type BarberItem, type BranchItem, type ServiceItem } from "@/components/admin/catalog/types";

export const metadata: Metadata = { title: "Barberos" };
export const dynamic = "force-dynamic";

export default async function BarberosPage() {
  let data;
  try {
    await connectDB();
    data = await getAdminCatalog();
  } catch (e) {
    return <LoadError title="Barberos" error={e} />;
  }
  return (
    <BarbersManager
      initial={serialize<BarberItem[]>(data.barbers)}
      branches={serialize<BranchItem[]>(data.branches)}
      services={serialize<ServiceItem[]>(data.services)}
    />
  );
}
