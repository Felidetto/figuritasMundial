import { redirect } from "next/navigation";
import { getAdminSettingsAction } from "@/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettingsAction();
  if (!settings) redirect("/admin/login");

  return (
    <div>
      <AdminNav />
      <h1 className="mb-6 text-2xl font-bold">Configuración</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
