import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSuperAdminAction } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Super Admin — Láminas 2026",
};

export async function guardSuperAdmin() {
  const admin = await requireSuperAdminAction();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function AdminPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  await guardSuperAdmin();
  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{title}</h1>
      {children}
    </AdminShell>
  );
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
