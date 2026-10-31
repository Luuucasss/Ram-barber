import type { Metadata } from "next";
import { ManageBooking } from "@/components/public/manage/ManageBooking";

export const metadata: Metadata = {
  title: "Tu turno",
  description: "Mirá, cambiá o cancelá tu turno en Ram Hair Studio.",
  // Private, token-based URL: keep it out of search engines and referrers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TurnoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ManageBooking token={token} />;
}
