import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/checkout/checkout-form";

interface Props {
  params: Promise<{ reservationId: string }>;
}

async function getCheckoutSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["whatsapp", "bank_instructions", "pickup_city", "min_shipping_qty", "shipping_cost"]);

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return {
    whatsapp: (map.whatsapp as string) ?? "+56900000000",
    bankInstructions: (map.bank_instructions as {
      bank: string;
      account_type: string;
      account_number: string;
      holder: string;
      rut: string;
    }) ?? {
      bank: "Banco Ejemplo",
      account_type: "Cuenta Vista",
      account_number: "00000000000",
      holder: "Titular",
      rut: "12.345.678-9",
    },
    pickupCity: (map.pickup_city as string) ?? "Osorno",
    minShipping: Number(map.min_shipping_qty ?? 50),
    shippingCost: Number(map.shipping_cost ?? 4490),
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { reservationId } = await params;
  const settings = await getCheckoutSettings();

  // Reservation validated client-side with token from sessionStorage
  // Server provides structure; client passes token on submit
  const supabase = createAdminClient();
  await supabase.rpc("expire_reservations");

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, public_code, item_count, subtotal, total, expires_at, status")
    .eq("id", reservationId)
    .eq("status", "reserved")
    .single();

  if (!reservation) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Completa tu pedido</h1>
      <CheckoutForm
        reservationId={reservationId}
        reservation={reservation}
        minShipping={settings.minShipping}
        shippingCost={settings.shippingCost}
        pickupCity={settings.pickupCity}
      />
    </div>
  );
}
