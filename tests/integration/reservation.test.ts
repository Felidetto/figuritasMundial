/**
 * Pruebas de integración — requieren Supabase local o remoto configurado.
 * Ejecutar: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm test tests/integration
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const skip = !url || !serviceKey;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

describe.skipIf(skip)("Reservation RPC integration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  let testStickerId: string;

  beforeAll(async () => {
    supabase = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sticker } = await supabase
      .from("stickers")
      .select("id, code")
      .limit(1)
      .single();

    if (!sticker) throw new Error("No stickers in seed");
    testStickerId = sticker.id;

    await supabase
      .from("inventory")
      .update({ physical_stock: 100, reserved_stock: 0, sold_stock: 0 })
      .eq("sticker_id", testStickerId);
  });

  it("crea reserva exitosa con cantidad mínima", async () => {
    const items = [{ sticker_id: testStickerId, qty: 15 }];

    const token = randomBytes(32).toString("hex");
    const { data } = await supabase.rpc("create_reservation", {
      p_items: items,
      p_access_token_hash: hashToken(token),
    });

    expect(data.success).toBe(true);
    expect(data.item_count).toBe(15);
  });

  it("rechaza stock insuficiente", async () => {
    await supabase
      .from("inventory")
      .update({ physical_stock: 1, reserved_stock: 0, sold_stock: 0 })
      .eq("sticker_id", testStickerId);

    const token = hashToken(randomBytes(32).toString("hex"));
    const { data } = await supabase.rpc("create_reservation", {
      p_items: [{ sticker_id: testStickerId, qty: 5 }],
      p_access_token_hash: token,
    });

    expect(data.success).toBe(false);
    expect(data.error).toBe("STOCK_CONFLICT");

    await supabase
      .from("inventory")
      .update({ physical_stock: 10, reserved_stock: 0, sold_stock: 0 })
      .eq("sticker_id", testStickerId);
  });

  it("solo una reserva gana la última unidad", async () => {
    await supabase
      .from("inventory")
      .update({ physical_stock: 1, reserved_stock: 0, sold_stock: 0 })
      .eq("sticker_id", testStickerId);

    const makeReservation = () =>
      supabase.rpc("create_reservation", {
        p_items: [{ sticker_id: testStickerId, qty: 1 }],
        p_access_token_hash: hashToken(randomBytes(32).toString("hex")),
      });

    const [r1, r2] = await Promise.all([makeReservation(), makeReservation()]);
    const successes = [r1.data, r2.data].filter((d) => d?.success).length;
    const conflicts = [r1.data, r2.data].filter((d) => d?.error === "STOCK_CONFLICT").length;

    expect(successes).toBe(1);
    expect(conflicts).toBe(1);

    const { data: inv } = await supabase
      .from("inventory")
      .select("physical_stock, reserved_stock")
      .eq("sticker_id", testStickerId)
      .single();

    expect(inv.reserved_stock).toBeLessThanOrEqual(inv.physical_stock);
    expect(inv.reserved_stock).toBe(1);

    await supabase.rpc("expire_reservations");
  });

  it("expira reservas y libera stock", async () => {
    await supabase
      .from("inventory")
      .update({ physical_stock: 5, reserved_stock: 0, sold_stock: 0 })
      .eq("sticker_id", testStickerId);

    const token = hashToken(randomBytes(32).toString("hex"));
    const { data: created } = await supabase.rpc("create_reservation", {
      p_items: [{ sticker_id: testStickerId, qty: 1 }],
      p_access_token_hash: token,
    });

    expect(created.success).toBe(true);

    await supabase
      .from("reservations")
      .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
      .eq("id", created.reservation_id);

    const { data: expiredCount } = await supabase.rpc("expire_reservations");
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const { data: inv } = await supabase
      .from("inventory")
      .select("reserved_stock")
      .eq("sticker_id", testStickerId)
      .single();

    expect(inv.reserved_stock).toBe(0);
  });
});
