"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAccessToken, hashAccessToken } from "@/lib/tokens";
import { createReservationSchema } from "@/lib/validation/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ReservationError, ReservationResult } from "@/types";

export async function createReservationAction(
  items: Array<{ sticker_id: string; qty: number }>,
): Promise<ReservationResult | ReservationError> {
  const parsed = createReservationSchema.safeParse({ items });
  if (!parsed.success) {
    return { success: false, error: "INVALID_ITEMS" };
  }

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rate = checkRateLimit(`reserve:${ip}`, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return { success: false, error: "RATE_LIMITED" };
  }

  const accessToken = generateAccessToken();
  const tokenHash = hashAccessToken(accessToken);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_reservation", {
    p_items: parsed.data.items,
    p_access_token_hash: tokenHash,
  });

  if (error) {
    console.error("create_reservation error:", error.message);
    return { success: false, error: "SERVER_ERROR" };
  }

  const result = data as Record<string, unknown>;

  if (!result.success) {
    return {
      success: false,
      error: result.error as string,
      unavailable: result.unavailable as ReservationError["unavailable"],
    };
  }

  return {
    success: true,
    reservationId: result.reservation_id as string,
    publicCode: result.public_code as string,
    accessToken,
    expiresAt: result.expires_at as string,
    itemCount: result.item_count as number,
    subtotal: result.subtotal as number,
    total: result.total as number,
  };
}

export async function getServerTimeAction(): Promise<string> {
  return new Date().toISOString();
}
