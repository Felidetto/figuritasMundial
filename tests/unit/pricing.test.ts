import type { PricingRule } from "@/lib/pricing";
import {
  calculatePricing,
  canShip,
  shippingCost,
  qtyToPromo50,
  DEFAULT_MIN_PICKUP,
  DEFAULT_MIN_SHIPPING,
  PROMO_50_TOTAL,
} from "@/lib/pricing";

const rules: PricingRule[] = [
  { id: "1", name: "15-24", rule_type: "tier", min_qty: 15, max_qty: 24, price_per_unit: 500, fixed_total: null, priority: 10, active: true },
  { id: "2", name: "25-39", rule_type: "tier", min_qty: 25, max_qty: 39, price_per_unit: 450, fixed_total: null, priority: 20, active: true },
  { id: "3", name: "40-49", rule_type: "tier", min_qty: 40, max_qty: 49, price_per_unit: 425, fixed_total: null, priority: 30, active: true },
  { id: "4", name: "51+", rule_type: "tier", min_qty: 51, max_qty: null, price_per_unit: 400, fixed_total: null, priority: 50, active: true },
  { id: "5", name: "Promo 50", rule_type: "fixed_exact", min_qty: 50, max_qty: 50, price_per_unit: null, fixed_total: 20000, priority: 100, active: true },
];

describe("calculatePricing", () => {
  it("rechaza menos de 15 láminas", () => {
    expect(() => calculatePricing(14, rules)).toThrow("MIN_QUANTITY");
  });

  it("calcula tramo 15-24 a $500", () => {
    expect(calculatePricing(20, rules).subtotal).toBe(10000);
  });

  it("calcula tramo 25-39 a $450", () => {
    expect(calculatePricing(30, rules).subtotal).toBe(13500);
  });

  it("calcula tramo 40-49 a $425", () => {
    expect(calculatePricing(45, rules).subtotal).toBe(19125);
  });

  it("aplica promoción de 50 láminas a $20.000", () => {
    const result = calculatePricing(50, rules);
    expect(result.subtotal).toBe(PROMO_50_TOTAL);
    expect(result.isPromo).toBe(true);
  });

  it("calcula 51+ a $400 c/u", () => {
    expect(calculatePricing(55, rules).subtotal).toBe(22000);
  });
});

describe("canShip", () => {
  it("no permite despacho bajo 50", () => {
    expect(canShip(49)).toBe(false);
    expect(canShip(50)).toBe(true);
  });
});

describe("shippingCost", () => {
  it("retiro sin costo", () => {
    expect(shippingCost(50, "pickup")).toBe(0);
  });

  it("despacho cobra aparte desde 50", () => {
    expect(shippingCost(50, "shipping", 4490)).toBe(4490);
  });

  it("rechaza despacho bajo mínimo", () => {
    expect(() => shippingCost(30, "shipping")).toThrow("SHIPPING_MIN_NOT_MET");
  });
});

describe("qtyToPromo50", () => {
  it("calcula faltante para promo", () => {
    expect(qtyToPromo50(35)).toBe(15);
    expect(qtyToPromo50(50)).toBe(0);
  });
});

describe("minimum pickup", () => {
  it("mínimo es 15", () => {
    expect(DEFAULT_MIN_PICKUP).toBe(15);
    expect(DEFAULT_MIN_SHIPPING).toBe(50);
  });
});
