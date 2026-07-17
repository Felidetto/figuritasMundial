import { z } from "zod";

export const cartItemSchema = z.object({
  stickerId: z.string().uuid(),
  code: z.string(),
  qty: z.number().int().min(1),
});

export const createReservationSchema = z.object({
  items: z.array(
    z.object({
      sticker_id: z.string().uuid(),
      qty: z.number().int().min(1),
    }),
  ).min(1),
});

export const checkoutSchema = z.object({
  reservationId: z.string().uuid(),
  accessToken: z.string().min(16),
  fullName: z.string().min(2, "Ingresa tu nombre completo"),
  whatsapp: z.string().min(8, "Ingresa un WhatsApp válido"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  marketplaceUsername: z.string().optional(),
  deliveryMethod: z.enum(["pickup", "shipping"]),
  region: z.string().min(2, "Selecciona región"),
  commune: z.string().min(2, "Selecciona comuna"),
  address: z.string().optional(),
  notes: z.string().optional(),
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, { message: "Debes aceptar las condiciones" }),
}).refine(
  (data) => data.deliveryMethod !== "shipping" || (data.address && data.address.length >= 5),
  { message: "Ingresa dirección para despacho", path: ["address"] },
);

export const stockAdjustSchema = z.object({
  stickerId: z.string().uuid(),
  newPhysical: z.number().int().min(0),
  reason: z.string().min(3),
  comment: z.string().optional(),
});

export const settingsSchema = z.object({
  whatsapp: z.string().min(8),
  shipping_cost: z.number().int().min(0),
  min_shipping_qty: z.number().int().min(1).default(50),
  reservation_ttl_minutes: z.number().int().min(5),
  payment_ttl_hours: z.number().int().min(1),
  pickup_address: z.string().min(5),
  bank_instructions: z.object({
    bank: z.string(),
    account_type: z.string(),
    account_number: z.string(),
    holder: z.string(),
    rut: z.string(),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
