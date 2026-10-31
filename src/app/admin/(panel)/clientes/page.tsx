import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsList } from "@/components/admin/clients/ClientsList";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando clientes…" />}>
      <ClientsList />
    </Suspense>
  );
}
