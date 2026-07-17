import type { CatalogSticker } from "@/types";

export interface CatalogStickerDTO {
  id: string;
  code: string;
  number: number;
  name: string | null;
  enabled: boolean;
  availableStock: number;
  physicalStock: number;
  reservedStock: number;
  soldStock: number;
}

export interface CatalogSectionDTO {
  sectionCode: string;
  sectionName: string;
  sortOrder: number;
  availableCount: number;
  totalStickers: number;
  stickers: CatalogStickerDTO[];
}

export function groupCatalogBySection(stickers: CatalogSticker[]): CatalogSectionDTO[] {
  const map = new Map<string, CatalogSectionDTO>();

  for (const s of stickers) {
    let section = map.get(s.section_code);
    if (!section) {
      section = {
        sectionCode: s.section_code,
        sectionName: s.section_name,
        sortOrder: s.section_sort_order,
        availableCount: 0,
        totalStickers: 0,
        stickers: [],
      };
      map.set(s.section_code, section);
    }

    const dto: CatalogStickerDTO = {
      id: s.id,
      code: s.code,
      number: s.number ?? 0,
      name: s.name,
      enabled: s.enabled,
      availableStock: s.available_qty,
      physicalStock: s.physical_stock,
      reservedStock: s.reserved_stock,
      soldStock: s.sold_stock,
    };

    section.stickers.push(dto);
    section.totalStickers += 1;
    if (s.enabled && s.available_qty > 0) section.availableCount += 1;
  }

  return Array.from(map.values())
    .map((sec) => ({
      ...sec,
      stickers: sec.stickers.sort((a, b) => a.number - b.number || a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sectionCode.localeCompare(b.sectionCode));
}

/** Convierte DTO de vuelta a CatalogSticker para status/helpers */
export function dtoToCatalogSticker(
  dto: CatalogStickerDTO,
  section: CatalogSectionDTO,
): CatalogSticker {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    enabled: dto.enabled,
    number: dto.number,
    section_id: "",
    section_code: section.sectionCode,
    section_name: section.sectionName,
    section_sort_order: section.sortOrder,
    physical_stock: dto.physicalStock,
    reserved_stock: dto.reservedStock,
    sold_stock: dto.soldStock,
    available_qty: dto.availableStock,
  };
}
