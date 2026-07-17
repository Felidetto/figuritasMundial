"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeCheckoutAction } from "@/actions/checkout";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/schemas";
import { formatCLP } from "@/lib/utils";
import { Countdown } from "@/components/shared/countdown";

interface CheckoutFormProps {
  reservationId: string;
  reservation: {
    public_code: string;
    item_count: number;
    subtotal: number;
    total: number;
    expires_at: string;
  };
  minShipping: number;
  shippingCost: number;
  pickupCity: string;
}

export function CheckoutForm({
  reservationId,
  reservation,
  minShipping,
  shippingCost: shippingCostClp,
}: CheckoutFormProps) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    publicCode: string;
    total: number;
    accessToken: string;
    expiresAt: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      reservationId,
      accessToken: "",
      deliveryMethod: "pickup",
      acceptTerms: undefined,
    },
  });

  const deliveryMethod = watch("deliveryMethod");

  useEffect(() => {
    const token = sessionStorage.getItem(`reservation_${reservationId}`);
    if (token) setAccessToken(token);
  }, [reservationId]);

  function onSubmit(data: CheckoutInput) {
    if (!accessToken) return;
    startTransition(async () => {
      const result = await completeCheckoutAction({
        ...data,
        reservationId,
        accessToken,
      });

      if (!result.success) {
        alert(
          result.error === "EXPIRED"
            ? "Tu reserva venció y las láminas fueron liberadas"
            : "No se pudo completar el pedido. Intenta nuevamente.",
        );
        return;
      }

      sessionStorage.removeItem(`reservation_${reservationId}`);
      setOrderResult({
        publicCode: result.publicCode,
        total: result.total,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      });

      // Fetch sticker codes from reservation items via redirect
      router.push(`/pedido/${result.accessToken}`);
    });
  }

  if (orderResult) {
    return null;
  }

  if (!accessToken) {
    return (
      <p className="text-red-600">
        No se encontró el token de reserva. Vuelve a seleccionar tus láminas.
      </p>
    );
  }

  const estimatedTotal =
    deliveryMethod === "shipping" && reservation.item_count >= minShipping
      ? reservation.subtotal + shippingCostClp
      : reservation.subtotal;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("reservationId")} value={reservationId} />
      <input type="hidden" {...register("accessToken")} value={accessToken} />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-bold text-emerald-950">Reserva {reservation.public_code}</p>
        <p className="text-sm">
          {reservation.item_count} láminas — {formatCLP(reservation.subtotal)}
        </p>
        <Countdown expiresAt={reservation.expires_at} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="fullName">
            Nombre completo *
          </label>
          <input
            id="fullName"
            {...register("fullName")}
            className="w-full rounded-lg border px-3 py-2"
          />
          {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="whatsapp">
            WhatsApp *
          </label>
          <input id="whatsapp" {...register("whatsapp")} className="w-full rounded-lg border px-3 py-2" />
          {errors.whatsapp && <p className="text-sm text-red-600">{errors.whatsapp.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Correo (opcional)
          </label>
          <input id="email" type="email" {...register("email")} className="w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="marketplaceUsername">
            Usuario Facebook Marketplace (opcional)
          </label>
          <input
            id="marketplaceUsername"
            {...register("marketplaceUsername")}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Modalidad *</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" value="pickup" {...register("deliveryMethod")} />
            Retiro en nuestro domicilio — Gratis
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="shipping"
              {...register("deliveryMethod")}
              disabled={reservation.item_count < minShipping}
            />
            Despacho — {formatCLP(shippingCostClp)} — Disponible desde {minShipping} láminas
            {reservation.item_count < minShipping && (
              <span className="text-xs text-slate-500">(desde {minShipping} láminas)</span>
            )}
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="region">
            Región *
          </label>
          <input id="region" {...register("region")} className="w-full rounded-lg border px-3 py-2" />
          {errors.region && <p className="text-sm text-red-600">{errors.region.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="commune">
            Comuna *
          </label>
          <input id="commune" {...register("commune")} className="w-full rounded-lg border px-3 py-2" />
          {errors.commune && <p className="text-sm text-red-600">{errors.commune.message}</p>}
        </div>
      </div>

      {deliveryMethod === "shipping" && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="address">
            Dirección de despacho *
          </label>
          <input id="address" {...register("address")} className="w-full rounded-lg border px-3 py-2" />
          {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notes">
          Observaciones
        </label>
        <textarea id="notes" {...register("notes")} rows={3} className="w-full rounded-lg border px-3 py-2" />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" {...register("acceptTerms")} className="mt-1" />
        <span>Acepto las condiciones de compra, reserva y retiro/despacho.</span>
      </label>
      {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>}

      <p className="text-lg font-bold">
        Total estimado: {formatCLP(estimatedTotal)}
        {deliveryMethod === "shipping" && ` (incluye despacho ${formatCLP(shippingCostClp)})`}
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
      >
        {isPending ? "Procesando…" : "Confirmar pedido"}
      </button>
    </form>
  );
}
