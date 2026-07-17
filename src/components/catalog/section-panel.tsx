"use client";

import { useState } from "react";
import type { CatalogSectionDTO } from "@/lib/catalog/group";
import { dtoToCatalogSticker } from "@/lib/catalog/group";
import type { CatalogSticker } from "@/types";
import { StickerButton } from "./sticker-button";

interface SectionPanelProps {
  section: CatalogSectionDTO;
  defaultOpen?: boolean;
  selectedMap: Map<string, number>;
  onAdd: (sticker: CatalogSticker) => void;
  onRemove: (stickerId: string) => void;
  onSetQty: (stickerId: string, qty: number, max: number) => void;
}

export function SectionPanel({
  section,
  defaultOpen = true,
  selectedMap,
  onAdd,
  onRemove,
  onSetQty,
}: SectionPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const sectionSelectedQty = section.stickers.reduce(
    (sum, s) => sum + (selectedMap.get(s.id) ?? 0),
    0,
  );

  return (
    <section
      className="rounded-xl border border-emerald-100 bg-white shadow-sm"
      aria-labelledby={`heading-${section.sectionCode}`}
    >
      <button
        type="button"
        id={`heading-${section.sectionCode}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-50/50"
      >
        <div>
          <p className="text-lg font-bold text-emerald-950">{section.sectionName}</p>
          <p className="text-sm text-emerald-700">
            <span className="font-mono font-semibold">{section.sectionCode}</span>
            {" · "}
            {section.availableCount} código{section.availableCount !== 1 ? "s" : ""} disponible
            {section.availableCount !== 1 ? "s" : ""} de {section.totalStickers}
            {sectionSelectedQty > 0 && (
              <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                {sectionSelectedQty} en tu selección
              </span>
            )}
          </p>
        </div>
        <span className="text-emerald-600" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border-t border-emerald-50 px-3 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
            {section.stickers.map((dto) => {
              const sticker = dtoToCatalogSticker(dto, section);
              const selectedQty = selectedMap.get(dto.id) ?? 0;
              return (
                <StickerButton
                  key={dto.id}
                  sticker={sticker}
                  selectedQty={selectedQty}
                  onAdd={() => {
                    if (selectedQty === 0) onAdd(sticker);
                    else onSetQty(dto.id, selectedQty + 1, dto.availableStock);
                  }}
                  onRemove={() => {
                    if (selectedQty <= 1) onRemove(dto.id);
                    else onSetQty(dto.id, selectedQty - 1, dto.availableStock);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
