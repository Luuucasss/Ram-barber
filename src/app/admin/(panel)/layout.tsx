import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

// Object form keeps the brand suffix on every admin tab ("Turnos · Ram Hair Studio");
// a bare string title here would drop the root template for all child pages.
export const metadata: Metadata = {
  title: { default: "Panel · Ram Hair Studio", template: "%s · Ram Hair Studio" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
