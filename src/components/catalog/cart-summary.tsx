"use client";

import { formatCLP } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartSummaryProps {
  totalQty: number;
  minPickup: number;
  minShipping: number;
  shippingCost: number;
  subtotal: number;
  savings: number;
  toPromo50: number;
  isPromo: boolean;
  items: CartItem[];
  onRemove: (id: string) => void;
  onReserve: () => void;
  isPending: boolean;
}

function SummaryContent({
  totalQty,
  minPickup,
  minShipping,
  shippingCost,
  subtotal,
  savings,
  toPromo50,
  isPromo,
  items,
  onRemove,
  onReserve,
  isPending,
}: CartSummaryProps) {
  const canReserve = totalQty >= minPickup;
  const toMin = Math.max(minPickup - totalQty, 0);

  return (
    <>
      <p className="text-base font-bold text-emerald-950">
        {totalQty} lámina{totalQty !== 1 ? "s" : ""}
        {canReserve ? ` — ${formatCLP(subtotal)}` : ""}
      </p>

      {totalQty > 0 && !canReserve && (
        <p className="mt-1 text-sm text-amber-800">
          Llevas {totalQty} lámina{totalQty !== 1 ? "s" : ""}. Agrega {toMin} más para alcanzar el
          mínimo.
        </p>
      )}

      {canReserve && toPromo50 > 0 && (
        <p className="mt-1 text-sm text-emerald-700">
          Llevas {totalQty} láminas. Agrega {toPromo50} más para obtener 50 por {formatCLP(20000)}.
        </p>
      )}

      {isPromo && (
        <p className="mt-1 text-sm font-semibold text-emerald-600">
          Promoción aplicada: 50 láminas por {formatCLP(20000)}.
          {savings > 0 && ` Ahorras ${formatCLP(savings)}.`}
        </p>
      )}

      {totalQty >= minShipping && (
        <p className="mt-1 text-xs text-slate-500">
          Despacho disponible (+{formatCLP(shippingCost)})
        </p>
      )}

      {items.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-emerald-700">Ver selección</summary>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
            {items.map((item) => (
              <li key={item.stickerId} className="flex justify-between gap-2">
                <span>
                  {item.code} ×{item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.stickerId)}
                  className="text-red-600 underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        type="button"
        onClick={onReserve}
        disabled={!canReserve || isPending}
        className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? "Reservando…" : "Reservar y comprar"}
      </button>
    </>
  );
}

export function CartSummary(props: CartSummaryProps) {
  return (
    <>
      {/* Móvil — sticky inferior */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-200 bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:hidden"
        role="region"
        aria-label="Resumen del pedido"
      >
        <SummaryContent {...props} />
      </div>

      {/* Escritorio — panel lateral */}
      <aside
        className="sticky top-20 hidden h-fit rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm lg:block"
        role="region"
        aria-label="Resumen del pedido"
      >
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-800">
          Tu selección
        </h2>
        <SummaryContent {...props} />
      </aside>
    </>
  );
}
