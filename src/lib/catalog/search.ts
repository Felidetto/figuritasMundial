/** Normaliza texto para búsqueda: minúsculas, sin acentos, espacios colapsados */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Convierte ARG10 → arg 10, FWC1 → fwc 1 */
export function normalizeStickerCodeInput(input: string): string {
  const trimmed = input.trim();
  // Código especial 00
  if (/^0{1,2}$/.test(trimmed)) return "00";
  // Patrón LETRAS + espacio opcional + número
  const match = trimmed.match(/^([a-zA-Z]{2,3})\s*(\d{1,2})$/);
  if (match) return `${match[1].toUpperCase()} ${parseInt(match[2], 10)}`;
  return trimmed.replace(/\s+/g, " ").toUpperCase();
}

export interface SearchableSticker {
  code: string;
  section_code: string;
  section_name: string;
  name: string | null;
  number?: number;
}

export function matchesStickerSearch(sticker: SearchableSticker, rawQuery: string): boolean {
  const q = normalizeSearchText(rawQuery);
  if (!q) return true;

  const normalizedCode = normalizeSearchText(normalizeStickerCodeInput(rawQuery));
  const codeNorm = normalizeSearchText(sticker.code);
  const sectionNorm = normalizeSearchText(sticker.section_code);
  const nameNorm = normalizeSearchText(sticker.section_name);
  const stickerNameNorm = normalizeSearchText(sticker.name ?? "");

  // Código exacto normalizado
  if (codeNorm === normalizedCode) return true;
  // Prefijo sección
  if (sectionNorm.startsWith(q) || q.startsWith(sectionNorm)) return true;
  // Contiene en código
  if (codeNorm.includes(q.replace(/\s/g, "")) || codeNorm.includes(q)) return true;
  // Nombre sección
  if (nameNorm.includes(q)) return true;
  // Nombre lámina
  if (stickerNameNorm.includes(q)) return true;
  // Solo número
  if (/^\d+$/.test(q) && sticker.number != null && String(sticker.number) === q) return true;

  return false;
}
