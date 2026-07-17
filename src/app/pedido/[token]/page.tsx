import { notFound } from "next/navigation";
import { getOrderByTokenAction } from "@/actions/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderView } from "@/components/checkout/order-view";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PedidoPage({ params }: Props) {
  const { token } = await params;
  const order = await getOrderByTokenAction(token);
  if (!order) notFound();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["whatsapp", "bank_instructions", "pickup_address"]);

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const showPickupAddress = order.status === "paid" && order.delivery_method === "pickup";

  return (
    <div className="mx-auto max-w-2xl">
      <OrderView
        order={order}
        accessToken={token}
        whatsapp={(map.whatsapp as string) ?? "+56900000000"}
        bankInstructions={
          (map.bank_instructions as {
            bank: string;
            account_type: string;
            account_number: string;
            holder: string;
            rut: string;
          }) ?? {
            bank: "",
            account_type: "",
            account_number: "",
            holder: "",
            rut: "",
          }
        }
        pickupAddress={showPickupAddress ? (map.pickup_address as string) : undefined}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}
