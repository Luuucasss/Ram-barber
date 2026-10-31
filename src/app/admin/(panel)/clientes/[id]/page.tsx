import type { Metadata } from "next";
import { ClientDetail } from "@/components/admin/clients/ClientDetail";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
