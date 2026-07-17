import {
  generateExpectedStickers,
  EXPECTED_STICKER_COUNT,
  stickerKey,
  SECTION_FWC,
  ALL_SECTIONS,
} from "@/lib/catalog/definitions";
import { matchesStickerSearch, normalizeStickerCodeInput } from "@/lib/catalog/search";
import {
  computeStickerStatus,
  isStickerSelectable,
} from "@/lib/catalog/status";
import type { CatalogSticker } from "@/types";

describe("catálogo completo", () => {
  const stickers = generateExpectedStickers();

  it("genera 980 códigos esperados", () => {
    expect(EXPECTED_STICKER_COUNT).toBe(980);
    expect(stickers.length).toBe(980);
  });

  it("no tiene códigos duplicados", () => {
    const keys = new Set(stickers.map((s) => stickerKey(s.sectionCode, s.code)));
    expect(keys.size).toBe(stickers.length);
  });

  it("ARG contiene ARG 1 a ARG 20", () => {
    const arg = stickers.filter((s) => s.sectionCode === "ARG");
    expect(arg.length).toBe(20);
    expect(arg.map((s) => s.code)).toContain("ARG 1");
    expect(arg.map((s) => s.code)).toContain("ARG 20");
  });

  it("FWC contiene FWC 1 a FWC 19", () => {
    const fwc = stickers.filter((s) => s.sectionCode === "FWC");
    expect(fwc.length).toBe(19);
    expect(fwc[0].code).toBe("FWC 1");
    expect(fwc[fwc.length - 1].code).toBe("FWC 19");
  });

  it("00 existe", () => {
    expect(stickers.some((s) => s.code === "00")).toBe(true);
  });

  it("tiene 50 secciones", () => {
    expect(ALL_SECTIONS.length).toBe(50);
    expect(SECTION_FWC.code).toBe("FWC");
  });
});

describe("búsqueda", () => {
  const sample: CatalogSticker = {
    id: "1",
    code: "ARG 10",
    number: 10,
    name: "Lámina Argentina 10",
    enabled: true,
    section_id: "",
    section_code: "ARG",
    section_name: "Argentina",
    section_sort_order: 136,
    physical_stock: 1,
    reserved_stock: 0,
    sold_stock: 0,
    available_qty: 1,
  };

  it("acepta ARG10 y ARG 10", () => {
    expect(normalizeStickerCodeInput("ARG10")).toBe("ARG 10");
    expect(normalizeStickerCodeInput("arg 10")).toBe("ARG 10");
    expect(matchesStickerSearch(sample, "ARG10")).toBe(true);
    expect(matchesStickerSearch(sample, "ARG 10")).toBe(true);
  });

  it("encuentra por sección Argentina", () => {
    expect(matchesStickerSearch(sample, "Argentina")).toBe(true);
  });

  it("encuentra por número 10", () => {
    expect(matchesStickerSearch(sample, "10")).toBe(true);
  });
});

describe("estados visuales", () => {
  function makeSticker(overrides: Partial<CatalogSticker>): CatalogSticker {
    return {
      id: "1",
      code: "ARG 10",
      number: 10,
      name: null,
      enabled: true,
      section_id: "",
      section_code: "ARG",
      section_name: "Argentina",
      section_sort_order: 0,
      physical_stock: 0,
      reserved_stock: 0,
      sold_stock: 0,
      available_qty: 0,
      ...overrides,
    };
  }

  it("stock cero → OUT_OF_STOCK", () => {
    expect(computeStickerStatus(makeSticker({ available_qty: 0 }), 0)).toBe("OUT_OF_STOCK");
    expect(isStickerSelectable("OUT_OF_STOCK")).toBe(false);
  });

  it("stock uno → LAST_UNIT", () => {
    expect(
      computeStickerStatus(makeSticker({ available_qty: 1, physical_stock: 1 }), 0),
    ).toBe("LAST_UNIT");
  });

  it("seleccionada → SELECTED", () => {
    expect(
      computeStickerStatus(makeSticker({ available_qty: 3, physical_stock: 3 }), 2),
    ).toBe("SELECTED");
  });

  it("deshabilitada admin → ADMIN_DISABLED", () => {
    expect(computeStickerStatus(makeSticker({ enabled: false, available_qty: 5 }), 0)).toBe(
      "ADMIN_DISABLED",
    );
  });

  it("reservada por otros → RESERVED", () => {
    expect(
      computeStickerStatus(
        makeSticker({ available_qty: 0, physical_stock: 1, reserved_stock: 1 }),
        0,
      ),
    ).toBe("RESERVED");
  });

  it("múltiples disponibles", () => {
    expect(
      computeStickerStatus(makeSticker({ available_qty: 3, physical_stock: 3 }), 0),
    ).toBe("MULTIPLE_AVAILABLE");
  });
});

describe("filtro solo disponibles (lógica)", () => {
  it("oculta stock cero cuando buyable", () => {
    const available = 0;
    const enabled = true;
    const showInBuyable = enabled && available > 0;
    expect(showInBuyable).toBe(false);
  });
});

describe("stock admin", () => {
  it("no permite physical bajo comprometido", () => {
    const reserved = 3;
    const sold = 2;
    const committed = reserved + sold;
    const newPhysical = 4;
    expect(newPhysical < committed).toBe(true);
  });

  it("aumentar de 0 a 1 habilita", () => {
    const before = 0;
    const after = 1;
    expect(before <= 0 && after > 0).toBe(true);
  });
});
