import Link from "next/link";
import { getPublicSettingsAction } from "@/actions/catalog";
import { formatCLP } from "@/lib/utils";
import { PACK_50_TOTAL, UNIT_PRICE } from "@/lib/pricing";
import { LegalNotice } from "@/components/shared/site-chrome";

export default async function HomePage() {
  const settings = await getPublicSettingsAction();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 px-6 py-12 text-white">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-200">
          FIFA World Cup 2026 — venta particular
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Elige tus láminas y completa tu álbum
        </h1>
        <p className="mt-4 max-w-xl text-emerald-100">
          Láminas físicas originales sobrantes, a elección. Retiro en nuestro domicilio disponible
          para cualquier compra.
        </p>
        <Link
          href="/elegir"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-bold text-emerald-800 hover:bg-emerald-50"
        >
          Elegir mis láminas
        </Link>
      </section>

      <LegalNotice />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6">
          <p className="text-sm font-medium text-emerald-700">Oferta destacada</p>
          <h2 className="text-2xl font-bold text-emerald-950">Pack de 50 láminas a elección</h2>
          <p className="mt-2 text-3xl font-black text-emerald-600">{formatCLP(PACK_50_TOTAL)}</p>
          <p className="mt-2 text-sm text-emerald-800">
            Desde la lámina 51: agrega las que necesites por {formatCLP(UNIT_PRICE)} cada una.
          </p>
        </div>

        <div className="rounded-2xl border p-6">
          <h2 className="font-bold text-emerald-950">Precios</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Cada lámina (1–49)</span>
              <span>{formatCLP(UNIT_PRICE)} c/u</span>
            </li>
            <li className="flex justify-between font-bold text-emerald-700">
              <span>Pack 50 láminas a elección</span>
              <span>{formatCLP(PACK_50_TOTAL)} fijo</span>
            </li>
            <li className="flex justify-between">
              <span>Desde lámina 51</span>
              <span>{formatCLP(UNIT_PRICE)} c/u adicional</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border p-6">
        <h2 className="font-bold">Retiro y despacho</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-emerald-800">Retiro en nuestro domicilio — Gratis</h3>
            <p className="text-sm text-slate-600">
              Disponible para cualquier cantidad. Sector: {settings.pickup_city ?? "Osorno"}. La
              dirección exacta se entrega al confirmar tu pedido.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-emerald-800">Despacho — {formatCLP(settings.shipping_cost ?? 2000)}</h3>
            <p className="text-sm text-slate-600">
              Disponible desde {settings.min_shipping_qty ?? 50} láminas. Pagado por el comprador.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
