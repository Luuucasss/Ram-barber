import type { Metadata } from "next";
import { getAdminCatalog } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { ServicesManager } from "@/components/admin/catalog/ServicesManager";
import { serialize, type BranchItem, type ServiceItem } from "@/components/admin/catalog/types";

export const metadata: Metadata = { title: "Servicios" };
export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  let data;
  try {
    await connectDB();
    data = await getAdminCatalog();
  } catch (e) {
    return <LoadError title="Servicios" error={e} />;
  }
  return (
    <ServicesManager
      initial={serialize<ServiceItem[]>(data.services)}
      branches={serialize<BranchItem[]>(data.branches)}
      currency={data.settings.currency}
    />
  );
}
