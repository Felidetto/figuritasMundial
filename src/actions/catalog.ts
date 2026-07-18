"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { groupCatalogBySection, type CatalogSectionDTO } from "@/lib/catalog/group";
import type { AppSettings, CatalogSticker } from "@/types";
import type { PricingRule } from "@/lib/pricing";

async function fetchCatalogStickers(): Promise<{ data: CatalogSticker[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: "Supabase no configurado" };
  }
  const supabase = createAdminClient();
  await supabase.rpc("expire_reservations");

  const { data, error } = await supabase
    .from("sticker_catalog")
    .select("*")
    .order("section_sort_order")
    .order("display_order");

  if (error) {
    console.error("getCatalog error:", error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => ({
      ...row,
      number: row.number ?? 0,
      physical_stock: row.physical_stock ?? 0,
      reserved_stock: row.reserved_stock ?? 0,
      sold_stock: row.sold_stock ?? 0,
      available_qty: row.available_qty ?? 0,
    })) as CatalogSticker[],
    error: null,
  };
}

export async function getCatalogAction(): Promise<CatalogSticker[]> {
  const { data } = await fetchCatalogStickers();
  return data;
}

export async function getCatalogGroupedAction(): Promise<{
  sections: CatalogSectionDTO[];
  error: string | null;
  totalStickers: number;
}> {
  const { data, error } = await fetchCatalogStickers();
  const sections = groupCatalogBySection(data);
  return { sections, error, totalStickers: data.length };
}

export async function refreshCatalogAction() {
  return getCatalogGroupedAction();
}

export async function getPricingRulesAction(): Promise<PricingRule[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false });

  return (data ?? []) as PricingRule[];
}

export async function getPublicSettingsAction(): Promise<Partial<AppSettings>> {
  if (!isSupabaseConfigured()) {
    return {
      store_name: "Láminas 2026",
      min_pickup_qty: 1,
      min_shipping_qty: 50,
      shipping_cost: 1500,
      pickup_city: "Osorno",
    };
  }
  const supabase = createAdminClient();
  const keys = [
    "store_name",
    "min_pickup_qty",
    "min_shipping_qty",
    "shipping_cost",
    "pickup_city",
  ];

  const { data } = await supabase.from("settings").select("key, value").in("key", keys);

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return {
    store_name: (settings.store_name as string) ?? "Láminas 2026",
    min_pickup_qty: Number(settings.min_pickup_qty ?? 1),
    min_shipping_qty: Number(settings.min_shipping_qty ?? 50),
    shipping_cost: Number(settings.shipping_cost ?? 1500),
    pickup_city: (settings.pickup_city as string) ?? "Osorno",
  };
}

export async function getCheckoutSettingsAction(accessToken: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("access_token_hash", accessToken)
    .maybeSingle();

  // Only return sensitive settings if valid token context (handled by page)
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["whatsapp", "bank_instructions", "pickup_address", "pickup_city"]);

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    whatsapp: (map.whatsapp as string) ?? "+56900000000",
    bank_instructions: map.bank_instructions as AppSettings["bank_instructions"],
    pickup_address: (map.pickup_address as string) ?? "",
    pickup_city: (map.pickup_city as string) ?? "Osorno",
    hasOrder: !!order,
  };
}
