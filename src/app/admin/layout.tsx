import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Administración — Láminas 2026",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
