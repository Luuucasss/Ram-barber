import type { Metadata, Viewport } from "next";
import { Inter, Grenze_Gotisch, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const gothic = Grenze_Gotisch({ subsets: ["latin"], variable: "--font-grenze", weight: ["500", "700", "900"], display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Ram Hair Studio — Reservá tu turno", template: "%s · Ram Hair Studio" },
  description: "Reservá tu turno online en Ram Hair Studio. Elegí servicio, barbero y horario en segundos.",
  openGraph: {
    title: "Ram Hair Studio",
    description: "Reservá tu turno online en segundos.",
    type: "website",
    locale: "es_AR",
  },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${gothic.variable} ${cormorant.variable}`}>
      <body className="grain">{children}</body>
    </html>
  );
}
