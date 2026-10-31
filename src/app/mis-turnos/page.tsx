import type { Metadata } from "next";
import { MyBookings } from "@/components/public/manage/MyBookings";
import { connectDB } from "@/lib/db";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mis turnos",
  description: "Buscá tus turnos en Ram Hair Studio con tu teléfono: cambialos o cancelalos online.",
};

async function loadWhatsapp() {
  try {
    await connectDB();
    return (await getSettings()).whatsapp;
  } catch {
    return DEFAULT_SETTINGS.whatsapp;
  }
}

export default async function MisTurnosPage() {
  return <MyBookings whatsapp={await loadWhatsapp()} />;
}
