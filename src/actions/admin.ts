"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAction } from "@/actions/catalog";
import { settingsSchema, stockAdjustSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const stockDeltaSchema = z.object({
  stickerId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3),
  comment: z.string().optional(),
});

export async function confirmPaymentAction(orderId: string) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("confirm_payment", {
    p_order_id: orderId,
    p_admin_id: admin.id,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pedidos");
  return data as { success: boolean; error?: string };
}

export async function cancelOrderAction(orderId: string, reason?: string) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
    p_admin_id: admin.id,
    p_reason: reason ?? "Cancelado por administrador",
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pedidos");
  return data as { success: boolean; error?: string };
}

export async function markDeliveredAction(orderId: string) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid");

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pedidos");
  return { success: true };
}

export async function adjustStockAction(input: unknown) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const parsed = stockAdjustSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("adjust_inventory", {
    p_sticker_id: parsed.data.stickerId,
    p_new_physical: parsed.data.newPhysical,
    p_reason: parsed.data.reason,
    p_admin_id: admin.id,
    p_comment: parsed.data.comment ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/inventario");
  revalidatePath("/elegir");
  return data as { success: boolean; error?: string };
}

export async function toggleStickerAction(stickerId: string, enabled: boolean) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("stickers").update({ enabled }).eq("id", stickerId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/inventario");
  revalidatePath("/elegir");
  return { success: true };
}

export async function updateSettingsAction(input: unknown) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION" };

  const supabase = createAdminClient();
  const entries: Array<[string, unknown]> = [
    ["whatsapp", JSON.stringify(parsed.data.whatsapp)],
    ["shipping_cost", parsed.data.shipping_cost],
    ["reservation_ttl_minutes", parsed.data.reservation_ttl_minutes],
    ["payment_ttl_hours", parsed.data.payment_ttl_hours],
    ["pickup_address", JSON.stringify(parsed.data.pickup_address)],
    ["bank_instructions", parsed.data.bank_instructions],
  ];

  for (const [key, value] of entries) {
    await supabase
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
  }

  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function adjustStockDeltaAction(input: unknown) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const parsed = stockDeltaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("adjust_inventory_delta", {
    p_sticker_id: parsed.data.stickerId,
    p_delta: parsed.data.delta,
    p_reason: parsed.data.reason,
    p_admin_id: admin.id,
    p_comment: parsed.data.comment ?? null,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; message?: string };
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      message: (result as { message?: string }).message,
    };
  }
  revalidatePath("/admin/inventario");
  revalidatePath("/elegir");
  return { success: true };
}

export async function updateStickerNameAction(stickerId: string, name: string) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("stickers").update({ name }).eq("id", stickerId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/inventario");
  return { success: true };
}

export async function exportInventoryAction(): Promise<string | null> {
  const admin = await requireAdminAction();
  if (!admin) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sticker_catalog")
    .select("section_code, code, name, physical_stock, enabled")
    .order("section_sort_order")
    .order("display_order");

  const lines = ["section,code,name,stock,enabled"];
  for (const row of data ?? []) {
    lines.push(
      `${row.section_code},${row.code},${(row.name ?? "").replace(/,/g, " ")},${row.physical_stock ?? 0},${row.enabled}`,
    );
  }
  return lines.join("\n");
}

function parseCsvRows(csvContent: string) {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return { error: "CSV vacío", rows: [] as never[] };

  const header = lines[0].toLowerCase().replace(/\s/g, "");
  if (header !== "section,code,name,stock,enabled") {
    return { error: "Encabezado inválido. Usa: section,code,name,stock,enabled", rows: [] as never[] };
  }

  const errors: string[] = [];
  const parsedRows: Array<{
    section: string;
    code: string;
    name: string;
    stock: number;
    enabled: boolean;
    line: number;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) {
      errors.push(`Fila ${i + 1}: columnas insuficientes`);
      continue;
    }
    const [section, code, name, stockStr, enabledStr] = parts;
    const stock = parseInt(stockStr, 10);
    if (Number.isNaN(stock) || stock < 0) {
      errors.push(`Fila ${i + 1}: stock inválido`);
      continue;
    }
    parsedRows.push({
      section,
      code,
      name,
      stock,
      enabled: enabledStr.toLowerCase() === "true",
      line: i + 1,
    });
  }

  if (errors.length > 0) return { error: "Errores de validación", rows: [] as never[], details: errors };
  return { error: null, rows: parsedRows, details: errors };
}

export async function previewCsvAction(csvContent: string, mode: "replace" | "add") {
  const admin = await requireAdminAction();
  if (!admin) return { valid: 0, invalid: ["No autorizado"], updates: [] };

  const parsed = parseCsvRows(csvContent);
  if (parsed.error) return { valid: 0, invalid: [parsed.error], updates: [] };

  const supabase = createAdminClient();
  const invalid: string[] = [...(parsed.details ?? [])];
  const updates: Array<{ code: string; current: number; new: number }> = [];

  for (const row of parsed.rows) {
    const { data: sticker } = await supabase
      .from("sticker_catalog")
      .select("id, code, physical_stock")
      .eq("code", row.code)
      .maybeSingle();

    if (!sticker) {
      invalid.push(`Fila ${row.line}: código no existe en catálogo (${row.code})`);
      continue;
    }

    const current = sticker.physical_stock ?? 0;
    const newStock = mode === "add" ? current + row.stock : row.stock;
    updates.push({ code: row.code, current, new: newStock });
  }

  return { valid: updates.length, invalid, updates };
}

export async function importCsvAction(
  csvContent: string,
  mode: "replace" | "add" = "replace",
) {
  const admin = await requireAdminAction();
  if (!admin) return { success: false, error: "UNAUTHORIZED", rows: [] as string[] };

  const parsed = parseCsvRows(csvContent);
  if (parsed.error) {
    return { success: false, error: parsed.error, rows: parsed.details ?? [] };
  }

  const preview = await previewCsvAction(csvContent, mode);
  if (preview.invalid.length > 0) {
    return { success: false, error: "Errores en CSV", rows: preview.invalid };
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  for (const row of parsed.rows) {
    const { data: sticker } = await supabase
      .from("stickers")
      .select("id")
      .eq("code", row.code)
      .maybeSingle();

    if (!sticker) {
      errors.push(`Fila ${row.line}: código no encontrado ${row.code}`);
      continue;
    }

    await supabase
      .from("stickers")
      .update({ name: row.name, enabled: row.enabled })
      .eq("id", sticker.id);

    const { data: inv } = await supabase
      .from("inventory")
      .select("physical_stock")
      .eq("sticker_id", sticker.id)
      .single();

    const current = inv?.physical_stock ?? 0;
    const newStock = mode === "add" ? current + row.stock : row.stock;

    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_sticker_id: sticker.id,
      p_new_physical: newStock,
      p_reason: mode === "add" ? "Importación CSV (sumar)" : "Importación CSV (reemplazar)",
      p_admin_id: admin.id,
      p_comment: `Fila ${row.line}`,
    });

    if (error) errors.push(`Fila ${row.line}: ${error.message}`);
    else if (data && !(data as { success: boolean }).success) {
      errors.push(`Fila ${row.line}: ${(data as { error: string }).error}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: "Importación con errores", rows: errors };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/elegir");
  return { success: true, error: null, rows: [`${parsed.rows.length} filas importadas (${mode})`] };
}

export async function adminLoginAction(email: string, password: string) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminLogoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function getAdminDashboardAction() {
  const admin = await requireAdminAction();
  if (!admin) return null;

  const supabase = createAdminClient();
  await supabase.rpc("expire_reservations");

  const [inventory, orders, reservations] = await Promise.all([
    supabase.from("sticker_catalog").select("available_qty, physical_stock, reserved_stock, sold_stock"),
    supabase.from("orders").select("id, public_code, status, total, created_at").order("created_at", { ascending: false }).limit(20),
    supabase
      .from("reservations")
      .select("id, public_code, status, expires_at, item_count, total")
      .in("status", ["reserved", "awaiting_payment"])
      .order("expires_at")
      .limit(20),
  ]);

  const items = inventory.data ?? [];
  const totalAvailable = items.reduce((s, i) => s + (i.available_qty ?? 0), 0);
  const totalPhysical = items.reduce((s, i) => s + (i.physical_stock ?? 0), 0);
  const totalReserved = items.reduce((s, i) => s + (i.reserved_stock ?? 0), 0);
  const totalSold = items.reduce((s, i) => s + (i.sold_stock ?? 0), 0);
  const pendingOrders = (orders.data ?? []).filter((o) =>
    ["awaiting_payment", "payment_reported"].includes(o.status),
  );
  const salesTotal = (orders.data ?? [])
    .filter((o) => o.status === "paid" || o.status === "delivered")
    .reduce((s, o) => s + o.total, 0);

  return {
    stats: { totalAvailable, totalPhysical, totalReserved, totalSold, salesTotal },
    orders: orders.data ?? [],
    pendingOrders,
    reservations: reservations.data ?? [],
  };
}

export async function getAdminInventoryAction() {
  const admin = await requireAdminAction();
  if (!admin) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sticker_catalog")
    .select("*")
    .order("section_sort_order")
    .order("display_order");

  return data ?? [];
}

export async function getAdminOrdersAction() {
  const admin = await requireAdminAction();
  if (!admin) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(`*, customers(full_name, whatsapp)`)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAdminSettingsAction() {
  const admin = await requireAdminAction();
  if (!admin) return null;

  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return map;
}
