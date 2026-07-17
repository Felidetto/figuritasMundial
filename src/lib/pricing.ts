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
  extraUnits: number;
}

export const UNIT_PRICE = 400;
export const PACK_50_TOTAL = 15000;
export const PACK_50_QTY = 50;
export const DEFAULT_MIN_PICKUP = 1;
export const DEFAULT_MIN_SHIPPING = 50;
export const DEFAULT_SHIPPING_COST = 2000;

/** Regla comercial definitiva — mirror de calculate_order_pricing SQL */
export function calculatePricing(qty: number): PricingResult {
  if (qty < 1) {
    throw new Error("MIN_QUANTITY");
  }

  if (qty < PACK_50_QTY) {
    const subtotal = qty * UNIT_PRICE;
    return {
      subtotal,
      ruleName: "unitario",
      isPromo: false,
      pricePerUnit: UNIT_PRICE,
      savings: 0,
      extraUnits: 0,
    };
  }

  if (qty === PACK_50_QTY) {
    const baseline = qty * UNIT_PRICE;
    return {
      subtotal: PACK_50_TOTAL,
      ruleName: "pack_50",
      isPromo: true,
      pricePerUnit: Math.round(PACK_50_TOTAL / qty),
      savings: Math.max(baseline - PACK_50_TOTAL, 0),
      extraUnits: 0,
    };
  }

  const extraUnits = qty - PACK_50_QTY;
  const subtotal = PACK_50_TOTAL + extraUnits * UNIT_PRICE;

  return {
    subtotal,
    ruleName: "pack_50_plus",
    isPromo: false,
    pricePerUnit: UNIT_PRICE,
    savings: Math.max(qty * UNIT_PRICE - subtotal, 0),
    extraUnits,
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
  return Math.max(PACK_50_QTY - qty, 0);
}

export function totalWithShipping(
  qty: number,
  rules: PricingRule[] | undefined,
  method: "pickup" | "shipping",
  shippingCostClp = DEFAULT_SHIPPING_COST,
  minShipping = DEFAULT_MIN_SHIPPING,
): number {
  const { subtotal } = calculatePricing(qty);
  const ship = shippingCost(qty, method, shippingCostClp, minShipping);
  return subtotal + ship;
}

export function pack51AddMessage(newQty: number): string {
  const { subtotal } = calculatePricing(newQty);
  return `Agregaste una lámina adicional por $400. Nuevo subtotal: $${subtotal.toLocaleString("es-CL")}.`;
}
