/**
 * Verifica paridad entre calculate_order_pricing (SQL) y lib/pricing.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { calculatePricing, totalWithShipping, DEFAULT_SHIPPING_COST } from "@/lib/pricing";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const skip = !url || !serviceKey;

describe.skipIf(skip)("calculate_order_pricing RPC", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

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
  ])("qty %i → subtotal %i", async (qty, expected) => {
    const { data, error } = await supabase.rpc("calculate_order_pricing", { p_qty: qty });
    expect(error).toBeNull();
    expect(data[0].subtotal).toBe(expected);
    expect(calculatePricing(qty).subtotal).toBe(expected);
  });

  it.each([
    [49, "pickup", 19600],
    [50, "pickup", 15000],
    [50, "shipping", 16500],
    [51, "pickup", 15400],
    [51, "shipping", 16900],
    [100, "pickup", 35000],
    [100, "shipping", 36500],
  ])("%i %s → total %i", async (qty, method, expected) => {
    const { data: pricing } = await supabase.rpc("calculate_order_pricing", { p_qty: qty });
    const { data: ship, error } = await supabase.rpc("calculate_shipping_cost", {
      p_qty: qty,
      p_method: method,
    });

    if (method === "shipping" && qty < 50) {
      expect(error).toBeTruthy();
      return;
    }

    expect(error).toBeNull();
    const total = pricing[0].subtotal + (ship ?? 0);
    expect(total).toBe(expected);
    expect(
      totalWithShipping(qty, undefined, method as "pickup" | "shipping", DEFAULT_SHIPPING_COST),
    ).toBe(expected);
  });
});
