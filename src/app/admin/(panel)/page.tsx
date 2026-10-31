import type { Metadata } from "next";
import { Suspense } from "react";
import { AgendaView } from "@/components/admin/agenda/AgendaView";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando agenda…" />}>
      <AgendaView />
    </Suspense>
  );
}
