import { formatCLP } from "./utils";

interface WhatsAppMessageParams {
  code: string;
  customerName: string;
  quantity: number;
  total: number;
  deliveryMethod: "pickup" | "shipping";
  marketplaceUsername?: string | null;
  stickerCodes: string[];
  orderUrl: string;
}

export function buildWhatsAppMessage(params: WhatsAppMessageParams): string {
  const modality = params.deliveryMethod === "pickup" ? "Retiro en Osorno" : "Despacho";
  const marketplace = params.marketplaceUsername
    ? params.marketplaceUsername
    : "No indicado";

  return [
    `Hola, creé el pedido ${params.code}.`,
    `Nombre: ${params.customerName}`,
    `Cantidad: ${params.quantity}`,
    `Total: ${formatCLP(params.total)}`,
    `Modalidad: ${modality}`,
    `Usuario Marketplace: ${marketplace}`,
    `Láminas: ${params.stickerCodes.join(", ")}`,
    `Enlace: ${params.orderUrl}`,
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = phone.replace(/\D/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
