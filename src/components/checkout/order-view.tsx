"use client";

import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCLP, formatDateCL } from "@/lib/utils";
import { Countdown } from "@/components/shared/countdown";
import type { PublicOrder } from "@/types";

const statusLabels: Record<string, string> = {
  awaiting_payment: "Pendiente de pago",
  payment_reported: "Pago reportado",
  paid: "Pagado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

interface OrderViewProps {
  order: PublicOrder;
  accessToken: string;
  whatsapp: string;
  bankInstructions: {
    bank: string;
    account_type: string;
    account_number: string;
    holder: string;
    rut: string;
  };
  pickupAddress?: string;
  appUrl: string;
}

export function OrderView({
  order,
  accessToken,
  whatsapp,
  bankInstructions,
  pickupAddress,
  appUrl,
}: OrderViewProps) {
  const orderUrl = `${appUrl}/pedido/${accessToken}`;

  const message = buildWhatsAppMessage({
    code: order.public_code,
    customerName: order.customer_name ?? "Cliente",
    quantity: order.item_count,
    total: order.total,
    deliveryMethod: order.delivery_method as "pickup" | "shipping",
    marketplaceUsername: null,
    stickerCodes: order.items.map((i) => `${i.sticker_code}×${i.qty}`),
    orderUrl,
  });

  const waUrl = buildWhatsAppUrl(whatsapp, message);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-emerald-700">Pedido</p>
        <h1 className="text-2xl font-bold text-emerald-950">{order.public_code}</h1>
        <p className="mt-1 text-sm">
          Estado: <strong>{statusLabels[order.status] ?? order.status}</strong>
        </p>
        {order.status === "awaiting_payment" && <Countdown expiresAt={order.expires_at} />}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-bold">Resumen</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.sticker_code} × {item.qty}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Subtotal: {formatCLP(order.subtotal)}
          {order.shipping_cost > 0 && ` + Despacho ${formatCLP(order.shipping_cost)}`}
        </p>
        <p className="text-lg font-bold">Total: {formatCLP(order.total)}</p>
        <p className="text-sm text-slate-600">
          Modalidad: {order.delivery_method === "pickup" ? "Retiro en Osorno" : "Despacho"}
        </p>
        <p className="text-xs text-slate-500">Vence: {formatDateCL(order.expires_at)}</p>
      </div>

      {order.status === "awaiting_payment" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-bold text-blue-950">Instrucciones de transferencia</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Banco: {bankInstructions.bank}</li>
            <li>Tipo: {bankInstructions.account_type}</li>
            <li>N° cuenta: {bankInstructions.account_number}</li>
            <li>Titular: {bankInstructions.holder}</li>
            <li>RUT: {bankInstructions.rut}</li>
          </ul>
          <p className="mt-3 text-sm">
            Transfiere {formatCLP(order.total)} e indica tu código{" "}
            <strong>{order.public_code}</strong> en el comentario.
          </p>
        </div>
      )}

      {order.delivery_method === "pickup" && order.status === "paid" && pickupAddress && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="font-bold">Dirección de retiro</h2>
          <p className="text-sm">{pickupAddress}</p>
        </div>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-full bg-green-600 py-3 font-bold text-white hover:bg-green-700"
      >
        Continuar por WhatsApp
      </a>
    </div>
  );
}
