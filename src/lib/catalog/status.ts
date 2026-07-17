import type { CatalogSticker } from "@/types";

export type StickerVisualStatus =
  | "AVAILABLE"
  | "SELECTED"
  | "LAST_UNIT"
  | "MULTIPLE_AVAILABLE"
  | "RESERVED"
  | "OUT_OF_STOCK"
  | "ADMIN_DISABLED";

export function computeStickerStatus(
  sticker: CatalogSticker,
  selectedQty: number,
): StickerVisualStatus {
  if (!sticker.enabled) return "ADMIN_DISABLED";

  const available = sticker.available_qty;

  if (selectedQty > 0) return "SELECTED";

  if (available <= 0) {
    if (sticker.reserved_stock > 0 && sticker.physical_stock > sticker.sold_stock) {
      return "RESERVED";
    }
    return "OUT_OF_STOCK";
  }

  if (available === 1) return "LAST_UNIT";
  if (available > 1) return "MULTIPLE_AVAILABLE";
  return "AVAILABLE";
}

export function isStickerSelectable(status: StickerVisualStatus): boolean {
  return ["AVAILABLE", "LAST_UNIT", "MULTIPLE_AVAILABLE", "SELECTED"].includes(status);
}

export const STATUS_LABELS: Record<StickerVisualStatus, string> = {
  AVAILABLE: "Disponible",
  SELECTED: "Seleccionada",
  LAST_UNIT: "Última unidad",
  MULTIPLE_AVAILABLE: "Disponible",
  RESERVED: "Reservada",
  OUT_OF_STOCK: "Agotada",
  ADMIN_DISABLED: "No disponible",
};
