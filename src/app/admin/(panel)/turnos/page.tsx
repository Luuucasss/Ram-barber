import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsTable } from "@/components/admin/bookings/BookingsTable";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Turnos" };

export default function TurnosPage() {
  return (
    <Suspense fallback={<Spinner label="Cargando turnos…" />}>
      <BookingsTable />
    </Suspense>
  );
}
