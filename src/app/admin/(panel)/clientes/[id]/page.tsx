import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { ClientDetail } from "@/components/admin/clients/ClientDetail";
import { connectDB } from "@/lib/db";
import { Client } from "@/lib/models";
import { formatPhone } from "@/lib/phone";

type Props = { params: Promise<{ id: string }> };

/** Tab title with the client's name ("Juan Pérez · Clientes · Ram Hair Studio"); falls back to "Cliente". */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    if (!isValidObjectId(id)) return { title: "Cliente" };
    await connectDB();
    const c = await Client.findById(id).select("name phone").lean<{ name?: string; phone?: string }>();
    const label = c?.name?.trim() || (c?.phone ? formatPhone(c.phone) : "");
    return { title: label ? `${label} · Clientes` : "Cliente" };
  } catch {
    return { title: "Cliente" };
  }
}

export default async function ClientePage({ params }: Props) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
