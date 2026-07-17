export type StickerVisualStatus =
  | "AVAILABLE"
  | "SELECTED"
  | "LAST_UNIT"
  | "MULTIPLE_AVAILABLE"
  | "RESERVED"
  | "OUT_OF_STOCK"
  | "ADMIN_DISABLED";

export interface CatalogSticker {
  id: string;
  code: string;
  number: number;
  name: string | null;
  enabled: boolean;
  section_id: string;
  section_code: string;
  section_name: string;
  section_sort_order: number;
  physical_stock: number;
  reserved_stock: number;
  sold_stock: number;
  available_qty: number;
}

export interface CartItem {
  stickerId: string;
  code: string;
  sectionCode: string;
  qty: number;
  maxQty: number;
}

export interface ReservationResult {
  success: true;
  reservationId: string;
  publicCode: string;
  accessToken: string;
  expiresAt: string;
  itemCount: number;
  subtotal: number;
  total: number;
}

export interface ReservationError {
  success: false;
  error: string;
  unavailable?: Array<{ sticker_id: string; code: string }>;
}

export interface PublicOrder {
  public_code: string;
  status: string;
  item_count: number;
  subtotal: number;
  shipping_cost: number;
  total: number;
  delivery_method: string;
  expires_at: string;
  items: Array<{ sticker_code: string; qty: number }>;
  customer_name?: string;
}

export interface AppSettings {
  store_name: string;
  min_pickup_qty: number;
  min_shipping_qty: number;
  shipping_cost: number;
  reservation_ttl_minutes: number;
  payment_ttl_hours: number;
  pickup_city: string;
  whatsapp: string;
  bank_instructions: {
    bank: string;
    account_type: string;
    account_number: string;
    holder: string;
    rut: string;
  };
  pickup_address: string;
}

export type { CatalogSectionDTO, CatalogStickerDTO } from "@/lib/catalog/group";
