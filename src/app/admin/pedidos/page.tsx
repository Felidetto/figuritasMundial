import { redirect } from "next/navigation";
import { getAdminOrdersAction } from "@/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrdersTable } from "@/components/admin/orders-table";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersAction();
  if (!orders) redirect("/admin/login");

  return (
    <div>
      <AdminNav />
      <h1 className="mb-6 text-2xl font-bold">Pedidos</h1>
      <OrdersTable orders={orders as Parameters<typeof OrdersTable>[0]["orders"]} />
    </div>
  );
}
