"use client";

import { useTransition } from "react";
import { confirmPaymentAction, cancelOrderAction, markDeliveredAction } from "@/actions/admin";
import { formatCLP, formatDateCL } from "@/lib/utils";

interface Order {
  id: string;
  public_code: string;
  status: string;
  total: number;
  item_count: number;
  delivery_method: string;
  created_at: string;
  customers: { full_name: string; whatsapp: string } | null;
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      window.location.reload();
    });
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b">
          <th className="p-2">Código</th>
          <th className="p-2">Cliente</th>
          <th className="p-2">Cant.</th>
          <th className="p-2">Total</th>
          <th className="p-2">Estado</th>
          <th className="p-2">Fecha</th>
          <th className="p-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-b">
            <td className="p-2 font-mono">{o.public_code}</td>
            <td className="p-2">
              {o.customers?.full_name}
              <br />
              <span className="text-xs text-slate-500">{o.customers?.whatsapp}</span>
            </td>
            <td className="p-2">{o.item_count}</td>
            <td className="p-2">{formatCLP(o.total)}</td>
            <td className="p-2">{o.status}</td>
            <td className="p-2 text-xs">{formatDateCL(o.created_at)}</td>
            <td className="p-2 space-x-1">
              {["awaiting_payment", "payment_reported"].includes(o.status) && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => confirmPaymentAction(o.id))}
                  className="text-emerald-700 underline"
                >
                  Confirmar pago
                </button>
              )}
              {!["paid", "delivered", "cancelled", "expired"].includes(o.status) && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => cancelOrderAction(o.id))}
                  className="text-red-600 underline"
                >
                  Cancelar
                </button>
              )}
              {o.status === "paid" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => markDeliveredAction(o.id))}
                  className="text-blue-700 underline"
                >
                  Entregado
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
