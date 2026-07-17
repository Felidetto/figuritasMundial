/**
 * Definición determinista del catálogo FIFA World Cup 2026.
 * Total esperado: 980 códigos (1 + 19 FWC + 48×20 selecciones).
 */

export interface SectionDefinition {
  code: string;
  name: string;
  sortOrder: number;
  /** Rango inclusive; omitir para sección especial */
  range?: { from: number; to: number };
  /** Código único sin número (sección 00) */
  singleCode?: string;
}

export const COUNTRY_SECTIONS: SectionDefinition[] = [
  { code: "MEX", name: "México", sortOrder: 100, range: { from: 1, to: 20 } },
  { code: "RSA", name: "Sudáfrica", sortOrder: 101, range: { from: 1, to: 20 } },
  { code: "KOR", name: "Corea del Sur", sortOrder: 102, range: { from: 1, to: 20 } },
  { code: "CZE", name: "Rep. Checa", sortOrder: 103, range: { from: 1, to: 20 } },
  { code: "CAN", name: "Canadá", sortOrder: 104, range: { from: 1, to: 20 } },
  { code: "BIH", name: "Bosnia", sortOrder: 105, range: { from: 1, to: 20 } },
  { code: "QAT", name: "Catar", sortOrder: 106, range: { from: 1, to: 20 } },
  { code: "SUI", name: "Suiza", sortOrder: 107, range: { from: 1, to: 20 } },
  { code: "BRA", name: "Brasil", sortOrder: 108, range: { from: 1, to: 20 } },
  { code: "MAR", name: "Marruecos", sortOrder: 109, range: { from: 1, to: 20 } },
  { code: "HAI", name: "Haití", sortOrder: 110, range: { from: 1, to: 20 } },
  { code: "SCO", name: "Escocia", sortOrder: 111, range: { from: 1, to: 20 } },
  { code: "USA", name: "Estados Unidos", sortOrder: 112, range: { from: 1, to: 20 } },
  { code: "PAR", name: "Paraguay", sortOrder: 113, range: { from: 1, to: 20 } },
  { code: "AUS", name: "Australia", sortOrder: 114, range: { from: 1, to: 20 } },
  { code: "TUR", name: "Turquía", sortOrder: 115, range: { from: 1, to: 20 } },
  { code: "GER", name: "Alemania", sortOrder: 116, range: { from: 1, to: 20 } },
  { code: "CUW", name: "Curazao", sortOrder: 117, range: { from: 1, to: 20 } },
  { code: "CIV", name: "Costa de Marfil", sortOrder: 118, range: { from: 1, to: 20 } },
  { code: "ECU", name: "Ecuador", sortOrder: 119, range: { from: 1, to: 20 } },
  { code: "NED", name: "Países Bajos", sortOrder: 120, range: { from: 1, to: 20 } },
  { code: "JPN", name: "Japón", sortOrder: 121, range: { from: 1, to: 20 } },
  { code: "SWE", name: "Suecia", sortOrder: 122, range: { from: 1, to: 20 } },
  { code: "TUN", name: "Túnez", sortOrder: 123, range: { from: 1, to: 20 } },
  { code: "BEL", name: "Bélgica", sortOrder: 124, range: { from: 1, to: 20 } },
  { code: "EGY", name: "Egipto", sortOrder: 125, range: { from: 1, to: 20 } },
  { code: "IRN", name: "Irán", sortOrder: 126, range: { from: 1, to: 20 } },
  { code: "NZL", name: "Nueva Zelanda", sortOrder: 127, range: { from: 1, to: 20 } },
  { code: "ESP", name: "España", sortOrder: 128, range: { from: 1, to: 20 } },
  { code: "CPV", name: "Cabo Verde", sortOrder: 129, range: { from: 1, to: 20 } },
  { code: "KSA", name: "Arabia Saudita", sortOrder: 130, range: { from: 1, to: 20 } },
  { code: "URU", name: "Uruguay", sortOrder: 131, range: { from: 1, to: 20 } },
  { code: "FRA", name: "Francia", sortOrder: 132, range: { from: 1, to: 20 } },
  { code: "SEN", name: "Senegal", sortOrder: 133, range: { from: 1, to: 20 } },
  { code: "IRQ", name: "Irak", sortOrder: 134, range: { from: 1, to: 20 } },
  { code: "NOR", name: "Noruega", sortOrder: 135, range: { from: 1, to: 20 } },
  { code: "ARG", name: "Argentina", sortOrder: 136, range: { from: 1, to: 20 } },
  { code: "ALG", name: "Argelia", sortOrder: 137, range: { from: 1, to: 20 } },
  { code: "AUT", name: "Austria", sortOrder: 138, range: { from: 1, to: 20 } },
  { code: "JOR", name: "Jordania", sortOrder: 139, range: { from: 1, to: 20 } },
  { code: "POR", name: "Portugal", sortOrder: 140, range: { from: 1, to: 20 } },
  { code: "COD", name: "RD Congo", sortOrder: 141, range: { from: 1, to: 20 } },
  { code: "UZB", name: "Uzbekistán", sortOrder: 142, range: { from: 1, to: 20 } },
  { code: "COL", name: "Colombia", sortOrder: 143, range: { from: 1, to: 20 } },
  { code: "ENG", name: "Inglaterra", sortOrder: 144, range: { from: 1, to: 20 } },
  { code: "CRO", name: "Croacia", sortOrder: 145, range: { from: 1, to: 20 } },
  { code: "GHA", name: "Ghana", sortOrder: 146, range: { from: 1, to: 20 } },
  { code: "PAN", name: "Panini", sortOrder: 147, range: { from: 1, to: 20 } },
];

export const SECTION_00: SectionDefinition = {
  code: "00",
  name: "Especial",
  sortOrder: 0,
  singleCode: "00",
};

export const SECTION_FWC: SectionDefinition = {
  code: "FWC",
  name: "FIFA World Cup",
  sortOrder: 1,
  range: { from: 1, to: 19 },
};

export const ALL_SECTIONS: SectionDefinition[] = [
  SECTION_00,
  SECTION_FWC,
  ...COUNTRY_SECTIONS,
];

export interface ExpectedSticker {
  sectionCode: string;
  code: string;
  number: number;
  displayOrder: number;
}

/** Genera la lista completa de códigos esperados (980). */
export function generateExpectedStickers(): ExpectedSticker[] {
  const result: ExpectedSticker[] = [];

  for (const section of ALL_SECTIONS) {
    if (section.singleCode) {
      result.push({
        sectionCode: section.code,
        code: section.singleCode,
        number: 0,
        displayOrder: 0,
      });
      continue;
    }
    if (!section.range) continue;
    for (let n = section.range.from; n <= section.range.to; n++) {
      result.push({
        sectionCode: section.code,
        code: `${section.code} ${n}`,
        number: n,
        displayOrder: n,
      });
    }
  }

  return result;
}

export const EXPECTED_STICKER_COUNT = generateExpectedStickers().length;

/** Clave única section+code para detectar duplicados */
export function stickerKey(sectionCode: string, code: string): string {
  return `${sectionCode}::${code}`;
}

export function getSectionByCode(code: string): SectionDefinition | undefined {
  return ALL_SECTIONS.find((s) => s.code === code);
}
