import { AdminPage } from "@/app/admin/layout";
import { getAdminOrdersAction } from "@/actions/admin";
import { SalesTable } from "@/components/admin/sales-table";

export default async function AdminVentasPage() {
  const orders = await getAdminOrdersAction();
  if (!orders) return null;

  return (
    <AdminPage title="Ventas">
      <SalesTable orders={orders} />
    </AdminPage>
  );
}
