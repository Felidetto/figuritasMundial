import { redirect } from "next/navigation";
import { getAdminDashboardAction } from "@/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { formatCLP, formatDateCL } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardAction();
  if (!data) redirect("/admin/login");

  return (
    <div>
      <AdminNav />
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Disponible" value={String(data.stats.totalAvailable)} />
        <StatCard label="Reservado" value={String(data.stats.totalReserved)} />
        <StatCard label="Vendido" value={String(data.stats.totalSold)} />
        <StatCard label="Ventas" value={formatCLP(data.stats.salesTotal)} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-bold">Pedidos pendientes ({data.pendingOrders.length})</h2>
        {data.pendingOrders.length === 0 ? (
          <p className="text-sm text-slate-500">Sin pedidos pendientes</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.pendingOrders.map((o) => (
              <li key={o.id} className="rounded border p-2">
                {o.public_code ?? o.id} — {formatCLP(o.total)} — {o.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">Reservas activas</h2>
        <ul className="space-y-2 text-sm">
          {data.reservations.map((r) => (
            <li key={r.id} className="rounded border p-2">
              {r.public_code} — {r.item_count} láminas — vence {formatDateCL(r.expires_at)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
