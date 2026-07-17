"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelOrderAction, confirmPaymentAction, markDeliveredAction } from "@/actions/admin";
import { formatCLP } from "@/lib/utils";

type OrderRow = {
  id: string;
  public_code: string;
  status: string;
  item_count: number;
  subtotal: number;
  shipping_cost: number;
  total: number;
  delivery_method: string;
  created_at: string;
  customers: { full_name: string; whatsapp: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Pendiente de pago",
  payment_reported: "Pago reportado",
  paid: "Pagado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function SalesTable({ orders }: { orders: OrderRow[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      const name = o.customers?.full_name?.toLowerCase() ?? "";
      const phone = o.customers?.whatsapp ?? "";
      return (
        o.public_code.toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.includes(q)
      );
    });
  }, [orders, filter, search]);

  function run(action: () => Promise<{ success: boolean }>) {
    startTransition(async () => {
      await action();
      setSelected(null);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar código, nombre, teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="awaiting_payment">Pendiente de pago</option>
          <option value="paid">Pagado</option>
          <option value="delivered">Entregado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

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
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.public_code}</td>
                <td className="p-3">{new Date(o.created_at).toLocaleDateString("es-CL")}</td>
                <td className="p-3">{o.customers?.full_name ?? "—"}</td>
                <td className="p-3">{o.item_count}</td>
                <td className="p-3">{formatCLP(o.total)}</td>
                <td className="p-3">{o.delivery_method === "shipping" ? "Despacho" : "Retiro"}</td>
                <td className="p-3">{STATUS_LABELS[o.status] ?? o.status}</td>
                <td className="p-3">
                  <button type="button" onClick={() => setSelected(o)} className="text-emerald-700 underline">
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold">{selected.public_code}</h3>
            <p className="text-sm">{selected.customers?.full_name}</p>
            <p className="text-sm">{selected.customers?.whatsapp}</p>
            <p className="mt-2 text-sm">
              {selected.item_count} láminas — Subtotal {formatCLP(selected.subtotal)} + Despacho{" "}
              {formatCLP(selected.shipping_cost)} = {formatCLP(selected.total)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.status === "awaiting_payment" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => confirmPaymentAction(selected.id))}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white"
                >
                  Confirmar pago
                </button>
              )}
              {selected.status === "paid" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => markDeliveredAction(selected.id))}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Marcar entregado
                </button>
              )}
              {!["cancelled", "delivered"].includes(selected.status) && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => cancelOrderAction(selected.id))}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600"
                >
                  Cancelar
                </button>
              )}
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border px-3 py-2 text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
