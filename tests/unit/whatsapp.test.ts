import { describe, it, expect } from "vitest";
import { buildWhatsAppMessage } from "@/lib/whatsapp";

describe("buildWhatsAppMessage", () => {
  it("genera mensaje con todos los campos", () => {
    const msg = buildWhatsAppMessage({
      code: "LAM-ABC12",
      customerName: "Juan Pérez",
      quantity: 50,
      total: 20000,
      deliveryMethod: "pickup",
      marketplaceUsername: "juan.mk",
      stickerCodes: ["FWC 1", "FWC 2"],
      orderUrl: "http://localhost:3000/pedido/token123",
    });

    expect(msg).toContain("LAM-ABC12");
    expect(msg).toContain("Juan Pérez");
    expect(msg).toContain("50");
    expect(msg).toContain("$20.000");
    expect(msg).toContain("Retiro en Osorno");
    expect(msg).toContain("juan.mk");
    expect(msg).toContain("FWC 1");
    expect(msg).toContain("token123");
  });
});
