import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LoadError } from "@/components/admin/catalog/LoadError";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  let settings;
  try {
    await connectDB();
    settings = await getSettings();
  } catch (e) {
    return <LoadError title="Configuración" error={e} />;
  }
  return <SettingsForm initial={settings} />;
}
