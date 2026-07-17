import { test, expect } from "@playwright/test";

test.describe("Flujo de compra MVP", () => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Requiere Supabase configurado");

  test("seleccionar 50, reservar y completar checkout", async ({ page }) => {
    await page.goto("/elegir");

    // Seleccionar láminas disponibles de sección FWC
    const availableButtons = page.locator('button[aria-pressed="false"]:not([disabled])');
    let selected = 0;
    const count = await availableButtons.count();

    for (let i = 0; i < count && selected < 50; i++) {
      await availableButtons.nth(i).click();
      selected += 1;
    }

    // Verificar resumen muestra promo
    await expect(page.getByRole("region", { name: "Resumen del pedido" })).toContainText("50");

    await page.getByRole("button", { name: "Reservar y comprar" }).click();
    await page.waitForURL(/checkout/);

    await page.getByLabel("Nombre completo").fill("Test Usuario");
    await page.getByLabel("WhatsApp").fill("+56912345678");
    await page.getByLabel("Región").fill("Los Lagos");
    await page.getByLabel("Comuna").fill("Osorno");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await page.waitForURL(/pedido/);
    await expect(page.getByText("LAM-")).toBeVisible();
    await expect(page.getByText("$20.000")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar por WhatsApp" })).toBeVisible();
  });
});
