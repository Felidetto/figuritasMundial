"use client";

import { cn } from "@/lib/utils";
import {
  computeStickerStatus,
  isStickerSelectable,
  STATUS_LABELS,
  type StickerVisualStatus,
} from "@/lib/catalog/status";
import type { CatalogSticker } from "@/types";

const statusStyles: Record<StickerVisualStatus, string> = {
  AVAILABLE:
    "border-emerald-300 bg-white text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer",
  MULTIPLE_AVAILABLE:
    "border-emerald-300 bg-white text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer",
  LAST_UNIT:
    "border-amber-400 bg-amber-50 text-amber-950 hover:border-amber-500 cursor-pointer",
  SELECTED:
    "border-emerald-700 bg-emerald-600 text-white ring-2 ring-emerald-300 cursor-pointer",
  RESERVED: "border-slate-300 bg-slate-200 text-slate-500 cursor-not-allowed",
  OUT_OF_STOCK: "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
  ADMIN_DISABLED: "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed",
};

interface StickerButtonProps {
  sticker: CatalogSticker;
  selectedQty: number;
  onAdd: () => void;
  onRemove: () => void;
  compact?: boolean;
}

export function StickerButton({
  sticker,
  selectedQty,
  onAdd,
  onRemove,
  compact,
}: StickerButtonProps) {
  const status = computeStickerStatus(sticker, selectedQty);
  const selectable = isStickerSelectable(status) || selectedQty > 0;
  const disabled = !selectable && selectedQty === 0;

  const badge =
    status === "LAST_UNIT" && selectedQty === 0 ? (
      <span className="text-[9px] font-medium text-amber-700" aria-hidden="true">
        Última
      </span>
    ) : status === "MULTIPLE_AVAILABLE" && selectedQty === 0 ? (
      <span
        className="text-[9px] font-medium text-emerald-700"
        aria-label={`${sticker.available_qty} disponibles`}
      >
        {sticker.available_qty} disp.
      </span>
    ) : status === "RESERVED" ? (
      <span className="text-[9px]">Reservada</span>
    ) : status === "OUT_OF_STOCK" ? (
      <span className="text-[9px]" aria-hidden="true">
        🔒 Agotada
      </span>
    ) : status === "ADMIN_DISABLED" ? (
      <span className="text-[9px]">No disp.</span>
    ) : null;

  return (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        onClick={() => {
          if (selectedQty === 0 && !disabled) onAdd();
        }}
        disabled={disabled && selectedQty === 0}
        aria-label={`${sticker.code}, ${STATUS_LABELS[status]}${selectedQty ? `, ${selectedQty} en selección` : ""}`}
        aria-pressed={selectedQty > 0}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border px-1.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600",
          statusStyles[status],
          compact ? "min-h-10" : "min-h-12",
        )}
      >
        <span className="leading-tight">{sticker.code}</span>
        {selectedQty > 0 && (
          <span className="mt-0.5 flex items-center gap-0.5 text-[10px]" aria-hidden="true">
            ✓ ×{selectedQty}
          </span>
        )}
        {badge}
      </button>

      {selectedQty > 0 && sticker.available_qty > 0 && (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar una ${sticker.code}`}
            className="flex h-6 w-6 items-center justify-center rounded border border-emerald-300 bg-white text-sm font-bold text-emerald-800 hover:bg-emerald-50"
          >
            −
          </button>
          <span className="min-w-[1.25rem] text-center text-xs font-bold">{selectedQty}</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={selectedQty >= sticker.available_qty}
            aria-label={`Agregar una ${sticker.code}`}
            className="flex h-6 w-6 items-center justify-center rounded border border-emerald-300 bg-white text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
