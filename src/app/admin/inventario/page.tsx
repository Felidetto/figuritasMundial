import { redirect } from "next/navigation";
import { getAdminInventoryAction } from "@/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { InventoryAdmin } from "@/components/admin/inventory-admin";

export default async function AdminInventoryPage() {
  const rows = await getAdminInventoryAction();
  if (!rows) redirect("/admin/login");

  return (
    <div>
      <AdminNav />
      <h1 className="mb-6 text-2xl font-bold">Inventario</h1>
      <InventoryAdmin rows={rows as Parameters<typeof InventoryAdmin>[0]["rows"]} />
    </div>
  );
}
