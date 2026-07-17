import Link from "next/link";
import { getPublicSettingsAction } from "@/actions/catalog";
import { formatCLP } from "@/lib/utils";
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
          Láminas físicas originales sobrantes, a elección. Retiro sin costo en{" "}
          {settings.pickup_city ?? "Osorno"} desde 15 unidades.
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
          <h2 className="text-2xl font-bold text-emerald-950">50 láminas a elección</h2>
          <p className="mt-2 text-3xl font-black text-emerald-600">{formatCLP(20000)}</p>
          <p className="mt-2 text-sm text-emerald-800">
            Ahorra frente a comprar 50 sueltas a {formatCLP(500)} c/u ({formatCLP(25000)}).
          </p>
        </div>

        <div className="rounded-2xl border p-6">
          <h2 className="font-bold text-emerald-950">Comparación de precios</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>15 – 24 láminas</span>
              <span>{formatCLP(500)} c/u</span>
            </li>
            <li className="flex justify-between">
              <span>25 – 39 láminas</span>
              <span>{formatCLP(450)} c/u</span>
            </li>
            <li className="flex justify-between">
              <span>40 – 49 láminas</span>
              <span>{formatCLP(425)} c/u</span>
            </li>
            <li className="flex justify-between font-bold text-emerald-700">
              <span>50 láminas (promo)</span>
              <span>{formatCLP(20000)} fijo</span>
            </li>
            <li className="flex justify-between">
              <span>51+ láminas</span>
              <span>{formatCLP(400)} c/u</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border p-6">
        <h2 className="font-bold">Retiro y despacho</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-emerald-800">Retiro en {settings.pickup_city}</h3>
            <p className="text-sm text-slate-600">
              Sin costo. Mínimo {settings.min_pickup_qty ?? 15} láminas. La dirección exacta se
              entrega al confirmar tu pedido.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-emerald-800">Despacho</h3>
            <p className="text-sm text-slate-600">
              Disponible desde {settings.min_shipping_qty ?? 50} láminas. Costo:{" "}
              {formatCLP(settings.shipping_cost ?? 4490)} (pagado por el comprador).
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="rounded-full bg-white px-4 py-2 shadow-sm">✓ Stock actualizado</span>
        <span className="rounded-full bg-white px-4 py-2 shadow-sm">✓ Reserva segura</span>
        <span className="rounded-full bg-white px-4 py-2 shadow-sm">✓ Pago por transferencia</span>
      </section>
    </div>
  );
}
