import Link from "next/link";
import { AdminPage } from "@/app/admin/layout";
import { getAdminDashboardAction } from "@/actions/admin";
import { formatCLP } from "@/lib/utils";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardAction();
  if (!data) return null;

  const { stats, recentOrders, reservations } = data;

  return (
    <AdminPage title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventas hoy" value={stats.sales_today_count} />
        <StatCard label="Ventas mes" value={stats.sales_month_count} />
        <StatCard label="Ingresos hoy" value={formatCLP(stats.revenue_today)} />
        <StatCard label="Ingresos mes" value={formatCLP(stats.revenue_month)} />
        <StatCard label="Pendientes de pago" value={stats.pending_payment} />
        <StatCard label="Pagados" value={stats.paid_orders} />
        <StatCard label="Entregados" value={stats.delivered_orders} />
        <StatCard label="Láminas vendidas" value={stats.stickers_sold} />
        <StatCard label="Stock disponible" value={stats.stock_available} />
        <StatCard label="Con stock" value={stats.codes_with_stock} />
        <StatCard label="Agotados" value={stats.codes_out_of_stock} />
        <StatCard label="Reservas activas" value={stats.active_reservations} />
        <StatCard label="Por expirar (10 min)" value={stats.expiring_soon} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/inventario" className="rounded-full bg-emerald-700 px-4 py-2 text-sm text-white">
          Administrar inventario
        </Link>
        <Link href="/admin/ventas" className="rounded-full border px-4 py-2 text-sm">
          Ver ventas
        </Link>
        <Link href="/admin/ventas?filter=pending" className="rounded-full border px-4 py-2 text-sm">
          Pedidos pendientes
        </Link>
        <Link href="/elegir" className="rounded-full border px-4 py-2 text-sm">
          Abrir tienda pública
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Ventas recientes</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Cant.</th>
                <th className="p-3">Total</th>
                <th className="p-3">Entrega</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono">{o.public_code}</td>
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString("es-CL")}</td>
                  <td className="p-3">{o.customer_name ?? "—"}</td>
                  <td className="p-3">{o.item_count}</td>
                  <td className="p-3">{formatCLP(o.total)}</td>
                  <td className="p-3">{o.delivery_method === "shipping" ? "Despacho" : "Retiro"}</td>
                  <td className="p-3">{o.status}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Sin ventas recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {reservations.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Reservas activas</h2>
          <ul className="space-y-2 text-sm">
            {reservations.map((r) => (
              <li key={r.id} className="rounded-lg border bg-white p-3">
                {r.public_code} — {r.item_count} láminas — expira{" "}
                {new Date(r.expires_at).toLocaleString("es-CL")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminPage>
  );
}
