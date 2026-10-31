import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { BookingApp } from "@/components/public/booking/BookingWizard";
import { toBookingCatalog } from "@/components/public/booking/catalog";
import type { BookingCatalog } from "@/components/public/booking/types";
import { connectDB } from "@/lib/db";
import { getPublicCatalog } from "@/lib/catalog";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservá tu turno",
  description: "Elegí servicio, barbero, día y hora. Reservá tu turno en Ram Hair Studio en segundos.",
};

export default async function ReservarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = sp.servicio;
  const servicio = typeof raw === "string" && /^[a-f\d]{24}$/i.test(raw) ? raw : null;

  let catalog: BookingCatalog | null = null;
  try {
    await connectDB();
    catalog = toBookingCatalog(await getPublicCatalog());
  } catch (e) {
    // The wizard retries client-side through /api/public/catalog.
    console.error("[reservar] catalog", e);
  }

  return (
    <PublicShell whatsapp={catalog?.settings.whatsapp ?? DEFAULT_SETTINGS.whatsapp}>
      <BookingApp initialCatalog={catalog} initialServiceId={servicio} />
    </PublicShell>
  );
}
