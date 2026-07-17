import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/hooks/use-cart";
import { SiteFooter, SiteHeader } from "@/components/shared/site-chrome";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Láminas 2026 — Completa tu álbum a elección",
    template: "%s | Láminas 2026",
  },
  description:
    "Láminas originales sobrantes FIFA World Cup 2026 a elección. 50 láminas por $20.000. Retiro en Osorno o despacho desde 50.",
  openGraph: {
    title: "Láminas 2026",
    description: "50 láminas a elección por $20.000. Stock actualizado.",
    locale: "es_CL",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${geist.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <CartProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
