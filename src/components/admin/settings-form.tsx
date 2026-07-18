"use client";

import { useTransition } from "react";
import { updateSettingsAction } from "@/actions/admin";

interface SettingsFormProps {
  settings: Record<string, unknown>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const bank = {
      bank: fd.get("bank") as string,
      account_type: fd.get("account_type") as string,
      account_number: fd.get("account_number") as string,
      holder: fd.get("holder") as string,
      rut: fd.get("rut") as string,
    };

    startTransition(async () => {
      await updateSettingsAction({
        whatsapp: fd.get("whatsapp") as string,
        shipping_cost: parseInt(fd.get("shipping_cost") as string, 10),
        min_shipping_qty: parseInt(fd.get("min_shipping_qty") as string, 10),
        reservation_ttl_minutes: parseInt(fd.get("reservation_ttl_minutes") as string, 10),
        payment_ttl_hours: parseInt(fd.get("payment_ttl_hours") as string, 10),
        pickup_address: fd.get("pickup_address") as string,
        bank_instructions: bank,
      });
      alert("Configuración guardada");
    });
  }

  const bank = (settings.bank_instructions ?? {}) as Record<string, string>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="text-sm font-medium">WhatsApp vendedor</label>
        <input
          name="whatsapp"
          defaultValue={(settings.whatsapp as string) ?? ""}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Costo despacho (CLP)</label>
        <input
          name="shipping_cost"
          type="number"
          defaultValue={Number(settings.shipping_cost ?? 1500)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Mínimo láminas para despacho</label>
        <input
          name="min_shipping_qty"
          type="number"
          defaultValue={Number(settings.min_shipping_qty ?? 50)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Duración reserva (minutos)</label>
        <input
          name="reservation_ttl_minutes"
          type="number"
          defaultValue={Number(settings.reservation_ttl_minutes ?? 30)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Duración pendiente de pago (horas)</label>
        <input
          name="payment_ttl_hours"
          type="number"
          defaultValue={Number(settings.payment_ttl_hours ?? 5)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Dirección de retiro (privada)</label>
        <textarea
          name="pickup_address"
          defaultValue={(settings.pickup_address as string) ?? ""}
          rows={2}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <fieldset className="space-y-2 rounded border p-4">
        <legend className="font-medium">Datos bancarios</legend>
        <input name="bank" placeholder="Banco" defaultValue={bank.bank ?? ""} className="w-full rounded border px-3 py-2" />
        <input name="account_type" placeholder="Tipo cuenta" defaultValue={bank.account_type ?? ""} className="w-full rounded border px-3 py-2" />
        <input name="account_number" placeholder="N° cuenta" defaultValue={bank.account_number ?? ""} className="w-full rounded border px-3 py-2" />
        <input name="holder" placeholder="Titular" defaultValue={bank.holder ?? ""} className="w-full rounded border px-3 py-2" />
        <input name="rut" placeholder="RUT" defaultValue={bank.rut ?? ""} className="w-full rounded border px-3 py-2" />
      </fieldset>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-emerald-700 px-6 py-2 text-white"
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
