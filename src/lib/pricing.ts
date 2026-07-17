export type PricingRuleType = "tier" | "fixed_exact";

export interface PricingRule {
  id: string;
  name: string;
  rule_type: PricingRuleType;
  min_qty: number;
  max_qty: number | null;
  price_per_unit: number | null;
  fixed_total: number | null;
  priority: number;
  active: boolean;
}

export interface PricingResult {
  subtotal: number;
  ruleName: string;
  isPromo: boolean;
  pricePerUnit: number | null;
  savings: number;
}

export const DEFAULT_MIN_PICKUP = 15;
export const DEFAULT_MIN_SHIPPING = 50;
export const DEFAULT_SHIPPING_COST = 4490;
export const PROMO_50_TOTAL = 20000;
export const PROMO_50_QTY = 50;

/** Calcula precio desde reglas de BD (mirror de calculate_order_pricing SQL) */
export function calculatePricing(qty: number, rules: PricingRule[]): PricingResult {
  if (qty < DEFAULT_MIN_PICKUP) {
    throw new Error("MIN_QUANTITY");
  }

  const active = rules.filter((r) => r.active);

  const exact = active
    .filter((r) => r.rule_type === "fixed_exact" && r.min_qty === qty)
    .sort((a, b) => b.priority - a.priority)[0];

  if (exact?.fixed_total != null) {
    const baseline = qty * 500;
    return {
      subtotal: exact.fixed_total,
      ruleName: exact.name,
      isPromo: true,
      pricePerUnit: Math.round(exact.fixed_total / qty),
      savings: Math.max(baseline - exact.fixed_total, 0),
    };
  }

  const tier = active
    .filter(
      (r) =>
        r.rule_type === "tier" &&
        qty >= r.min_qty &&
        (r.max_qty == null || qty <= r.max_qty),
    )
    .sort((a, b) => b.priority - a.priority || b.min_qty - a.min_qty)[0];

  if (!tier?.price_per_unit) {
    throw new Error("NO_PRICING_RULE");
  }

  const subtotal = qty * tier.price_per_unit;
  const baseline = qty * 500;
  const promo50Total = PROMO_50_TOTAL;
  const savings =
    qty === PROMO_50_QTY ? Math.max(baseline - promo50Total, 0) : Math.max(baseline - subtotal, 0);

  return {
    subtotal,
    ruleName: tier.name,
    isPromo: false,
    pricePerUnit: tier.price_per_unit,
    savings: qty >= DEFAULT_MIN_PICKUP ? savings : 0,
  };
}

export function canShip(qty: number, minShipping = DEFAULT_MIN_SHIPPING): boolean {
  return qty >= minShipping;
}

export function shippingCost(
  qty: number,
  method: "pickup" | "shipping",
  cost = DEFAULT_SHIPPING_COST,
  minShipping = DEFAULT_MIN_SHIPPING,
): number {
  if (method === "pickup") return 0;
  if (!canShip(qty, minShipping)) {
    throw new Error("SHIPPING_MIN_NOT_MET");
  }
  return cost;
}

export function qtyToPromo50(qty: number): number {
  return Math.max(PROMO_50_QTY - qty, 0);
}

export function totalWithShipping(
  qty: number,
  rules: PricingRule[],
  method: "pickup" | "shipping",
  shippingCostClp = DEFAULT_SHIPPING_COST,
): number {
  const { subtotal } = calculatePricing(qty, rules);
  const ship = shippingCost(qty, method, shippingCostClp);
  return subtotal + ship;
}
