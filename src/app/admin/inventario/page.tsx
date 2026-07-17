import { AdminPage } from "@/app/admin/layout";
import { getAdminInventoryAction } from "@/actions/admin";
import { InventoryVisualAdmin } from "@/components/admin/inventory-visual-admin";

export default async function AdminInventoryPage() {
  const rows = await getAdminInventoryAction();
  if (!rows) return null;

  return (
    <AdminPage title="Inventario">
      <InventoryVisualAdmin initialRows={rows as Parameters<typeof InventoryVisualAdmin>[0]["initialRows"]} />
    </AdminPage>
  );
}
