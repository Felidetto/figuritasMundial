import {
  getCatalogGroupedAction,
  getPricingRulesAction,
  getPublicSettingsAction,
} from "@/actions/catalog";
import { CatalogClient } from "@/components/catalog/catalog-client";

export const metadata = {
  title: "Elegir láminas",
};

export const dynamic = "force-dynamic";

export default async function ElegirPage() {
  const [catalog, pricingRules, settings] = await Promise.all([
    getCatalogGroupedAction(),
    getPricingRulesAction(),
    getPublicSettingsAction(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-emerald-950">Selector de láminas</h1>
      <p className="mb-6 text-sm text-slate-600">
        Recorre el catálogo por sección o busca un código. Toca para agregar. Mínimo{" "}
        {settings.min_pickup_qty ?? 15} láminas para retiro.
      </p>
      <CatalogClient
        initialSections={catalog.sections}
        initialError={catalog.error}
        initialTotal={catalog.totalStickers}
        pricingRules={pricingRules}
        minPickup={settings.min_pickup_qty ?? 15}
        minShipping={settings.min_shipping_qty ?? 50}
        shippingCost={settings.shipping_cost ?? 1500}
      />
    </div>
  );
}
