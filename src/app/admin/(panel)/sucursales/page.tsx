import type { Metadata } from "next";
import { getAdminCatalog } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { BranchesManager } from "@/components/admin/catalog/BranchesManager";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { serialize, type BarberItem, type BranchItem } from "@/components/admin/catalog/types";

export const metadata: Metadata = { title: "Sucursales" };
export const dynamic = "force-dynamic";

export default async function SucursalesPage() {
  let data;
  try {
    await connectDB();
    data = await getAdminCatalog();
  } catch (e) {
    return <LoadError title="Sucursales" error={e} />;
  }
  const barberCount: Record<string, number> = {};
  for (const b of serialize<BarberItem[]>(data.barbers)) barberCount[b.branchId] = (barberCount[b.branchId] ?? 0) + 1;
  return <BranchesManager initial={serialize<BranchItem[]>(data.branches)} barberCount={barberCount} />;
}
