"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema } from "@/lib/validation/schemas";
import { hashAccessToken } from "@/lib/tokens";

export async function completeCheckoutAction(input: unknown) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "VALIDATION", details: parsed.error.flatten() };
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  const { data: rpcData, error } = await supabase.rpc("complete_checkout", {
    p_reservation_id: data.reservationId,
    p_access_token_hash: hashAccessToken(data.accessToken),
    p_delivery_method: data.deliveryMethod,
    p_customer: {
      full_name: data.fullName,
      whatsapp: data.whatsapp,
      email: data.email ?? "",
      marketplace_username: data.marketplaceUsername ?? "",
      region: data.region,
      commune: data.commune,
      address: data.address ?? "",
      notes: data.notes ?? "",
    },
  });

  if (error) {
    console.error("complete_checkout error:", error.message);
    return { success: false as const, error: "SERVER_ERROR" };
  }

  const result = rpcData as Record<string, unknown>;
  if (!result.success) {
    return { success: false as const, error: result.error as string };
  }

  return {
    success: true as const,
    orderId: result.order_id as string,
    publicCode: result.public_code as string,
    total: result.total as number,
    shippingCost: result.shipping_cost as number,
    expiresAt: result.expires_at as string,
    accessToken: data.accessToken,
  };
}

export async function getOrderByTokenAction(accessToken: string) {
  const supabase = createAdminClient();
  const tokenHash = hashAccessToken(accessToken);

  await supabase.rpc("expire_reservations");

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, public_code, status, item_count, subtotal, shipping_cost, total,
       delivery_method, expires_at, customers(full_name)`,
    )
    .eq("access_token_hash", tokenHash)
    .single();

  if (error || !order) {
    return null;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("sticker_code, qty")
    .eq("order_id", order.id);

  const customerRaw = order.customers as { full_name: string } | { full_name: string }[] | null;
  const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

  return {
    public_code: order.public_code,
    status: order.status,
    item_count: order.item_count,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    total: order.total,
    delivery_method: order.delivery_method,
    expires_at: order.expires_at,
    items: items ?? [],
    customer_name: customer?.full_name,
  };
}

export async function getReservationByTokenAction(
  reservationId: string,
  accessToken: string,
) {
  const supabase = createAdminClient();
  const tokenHash = hashAccessToken(accessToken);

  await supabase.rpc("expire_reservations");

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `id, public_code, status, item_count, subtotal, shipping_cost, total, expires_at`,
    )
    .eq("id", reservationId)
    .eq("access_token_hash", tokenHash)
    .single();

  if (error || !data) return null;
  return data;
}
