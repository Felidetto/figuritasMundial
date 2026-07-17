import {
  calculatePricing,
  canShip,
  shippingCost,
  totalWithShipping,
  qtyToPromo50,
  UNIT_PRICE,
  PACK_50_TOTAL,
  PACK_50_QTY,
  DEFAULT_MIN_PICKUP,
  DEFAULT_MIN_SHIPPING,
  DEFAULT_SHIPPING_COST,
  pack51AddMessage,
} from "@/lib/pricing";

describe("calculatePricing — reglas definitivas", () => {
  it.each([
    [1, 400],
    [10, 4000],
    [49, 19600],
    [50, 15000],
    [51, 15400],
    [52, 15800],
    [53, 16200],
    [60, 19000],
    [100, 35000],
  ])("cantidad %i → subtotal %i", (qty, expected) => {
    expect(calculatePricing(qty).subtotal).toBe(expected);
  });

  it("50 es promoción pack", () => {
    const r = calculatePricing(50);
    expect(r.isPromo).toBe(true);
    expect(r.ruleName).toBe("pack_50");
  });

  it("51+ mantiene base del pack", () => {
    const r = calculatePricing(51);
    expect(r.extraUnits).toBe(1);
    expect(r.ruleName).toBe("pack_50_plus");
  });

  it("rechaza cantidad 0", () => {
    expect(() => calculatePricing(0)).toThrow("MIN_QUANTITY");
  });
});

describe("entrega y despacho", () => {
  it.each([
    [49, "pickup", 19600],
    [50, "pickup", 15000],
    [50, "shipping", 17000],
    [51, "pickup", 15400],
    [51, "shipping", 17400],
    [53, "pickup", 16200],
    [53, "shipping", 18200],
    [100, "pickup", 35000],
    [100, "shipping", 37000],
  ])("%i con %s → total %i", (qty, method, expected) => {
    expect(
      totalWithShipping(qty, undefined, method as "pickup" | "shipping", DEFAULT_SHIPPING_COST),
    ).toBe(expected);
  });

  it("rechaza despacho con 49", () => {
    expect(() => shippingCost(49, "shipping")).toThrow("SHIPPING_MIN_NOT_MET");
    expect(canShip(49)).toBe(false);
    expect(canShip(50)).toBe(true);
  });

  it("retiro sin costo", () => {
    expect(shippingCost(10, "pickup")).toBe(0);
  });
});

describe("mensaje 50→51", () => {
  it("mensaje positivo al agregar lámina 51", () => {
    expect(pack51AddMessage(51)).toContain("15.400");
  });
});

describe("constantes", () => {
  it("valores base", () => {
    expect(UNIT_PRICE).toBe(400);
    expect(PACK_50_TOTAL).toBe(15000);
    expect(PACK_50_QTY).toBe(50);
    expect(DEFAULT_MIN_PICKUP).toBe(1);
    expect(DEFAULT_MIN_SHIPPING).toBe(50);
    expect(DEFAULT_SHIPPING_COST).toBe(2000);
  });

  it("qtyToPromo50", () => {
    expect(qtyToPromo50(35)).toBe(15);
    expect(qtyToPromo50(50)).toBe(0);
  });
});
