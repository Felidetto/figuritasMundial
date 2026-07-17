import { AdminPage } from "@/app/admin/layout";
import { getAdminSettingsAction } from "@/actions/admin";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettingsAction();
  if (!settings) return null;

  return (
    <AdminPage title="Configuración">
      <SettingsForm settings={settings} />
    </AdminPage>
  );
}
